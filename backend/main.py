import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import Optional

from backend.database import engine, Base, get_db
from backend import models, schemas, crud, auth

# Initialize DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sudoku Quest API", version="1.0.0")

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ROUTERS ---

@app.post("/api/auth/register", response_model=schemas.UserProfile)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    return crud.create_user(db, user)

@app.post("/api/auth/login", response_model=schemas.Token)
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, user.username)
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/profile", response_model=schemas.UserProfile)
def get_profile(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return crud.get_user_profile(db, current_user)


# --- GAME ROUTERS ---

@app.post("/api/game/start", response_model=schemas.GameState)
def start_game(
    request: schemas.GameStartRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    game = crud.create_active_game(db, current_user, request.size, request.difficulty)
    return game

@app.get("/api/game/state", response_model=Optional[schemas.GameState])
def get_game_state(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.active_game:
        return None
    return current_user.active_game

@app.post("/api/game/save", response_model=schemas.GameState)
def save_game(
    move: schemas.GameMoveRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    if not current_user.active_game:
        raise HTTPException(status_code=400, detail="No active game to save")
    return crud.update_active_game(db, current_user.active_game, move)

@app.post("/api/game/validate-cell")
def validate_cell(
    request: schemas.ValidateCellRequest,
    current_user: models.User = Depends(auth.get_current_user)
):
    game = current_user.active_game
    if not game:
        raise HTTPException(status_code=400, detail="No active game")
    
    # Check values bounds
    if request.r < 0 or request.r >= game.size or request.c < 0 or request.c >= game.size:
        raise HTTPException(status_code=400, detail="Out of bounds")

    # In Python, lists in JSON fields are stored as JSON list objects
    solution_grid = game.solution
    correct_val = solution_grid[request.r][request.c]
    
    return {"correct": request.val == correct_val}

@app.get("/api/game/hint")
def get_hint(
    r: int,
    c: int,
    current_user: models.User = Depends(auth.get_current_user)
):
    game = current_user.active_game
    if not game:
        raise HTTPException(status_code=400, detail="No active game")

    if r < 0 or r >= game.size or c < 0 or c >= game.size:
        raise HTTPException(status_code=400, detail="Out of bounds")

    solution_grid = game.solution
    return {"val": solution_grid[r][c]}

@app.post("/api/game/submit", response_model=schemas.GameSubmitResponse)
def submit_game(
    request: schemas.GameSubmitRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    game = current_user.active_game
    if not game:
        raise HTTPException(status_code=400, detail="No active game to submit")

    # Check if grid matches solution
    user_grid = request.grid
    solution_grid = game.solution

    correct = True
    for r in range(game.size):
        for c in range(game.size):
            if user_grid[r][c] != solution_grid[r][c]:
                correct = False
                break
        if not correct:
            break

    if not correct:
        return schemas.GameSubmitResponse(
            success=True,
            correct=False,
            coins_earned=0,
            new_level=current_user.current_level,
            new_zone=current_user.current_zone,
            xp_earned=0
        )

    # Award algorithm:
    # 4x4: base 10 coins, 20 xp
    # 6x6: base 20 coins, 40 xp
    # 9x9: base 50 coins (easy), 75 (medium), 100 (hard); 100/150/200 xp
    base_coins = 10
    base_xp = 20
    if game.size == 6:
        base_coins = 25
        base_xp = 50
    elif game.size == 9:
        if game.difficulty == "easy":
            base_coins = 50
            base_xp = 100
        elif game.difficulty == "medium":
            base_coins = 80
            base_xp = 150
        else:
            base_coins = 120
            base_xp = 200

    # Add extra bonus if player didn't lose hearts
    heart_bonus = game.hearts * 5
    coins_earned = base_coins + heart_bonus
    xp_earned = base_xp + (game.hearts * 10)

    # Apply progress progression
    current_user.coins += coins_earned
    current_user.xp += xp_earned
    
    # Progress levels (Kid simple map: 5 levels per zone)
    # Zone 1 (4x4): levels 1-5
    # Zone 2 (6x6): levels 6-10
    # Zone 3 (9x9): levels 11-15
    next_level = current_user.current_level + 1
    next_zone = current_user.current_zone

    if next_level > 15:
        # Loop level or cap at 15
        next_level = 15
    else:
        # Determine new zone
        if next_level >= 11:
            next_zone = 3
        elif next_level >= 6:
            next_zone = 2

    current_user.current_level = next_level
    current_user.current_zone = next_zone

    # Remove active game
    crud.delete_active_game(db, game)
    db.commit()

    return schemas.GameSubmitResponse(
        success=True,
        correct=True,
        coins_earned=coins_earned,
        new_level=next_level,
        new_zone=next_zone,
        xp_earned=xp_earned
    )

@app.post("/api/game/use-item")
def use_item(
    item_type: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    success, error = crud.use_item(db, current_user, item_type)
    if not success:
        raise HTTPException(status_code=400, detail=error)
    return {"success": True, "message": f"Used {item_type} successfully"}


# --- SHOP ROUTERS ---

@app.post("/api/shop/buy", response_model=schemas.ShopBuyResponse)
def buy_item(
    request: schemas.ShopBuyRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    inv_item, error = crud.buy_item(db, current_user, request.item_type, request.quantity)
    if error:
        raise HTTPException(status_code=400, detail=error)
    
    return schemas.ShopBuyResponse(
        success=True,
        item_type=request.item_type,
        quantity=inv_item.quantity,
        remaining_coins=current_user.coins
    )

# Static files hosting (for serving production React builds)
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
static_path = os.path.join(base_dir, "frontend", "dist")

if not os.path.exists(static_path):
    # Fallback to local user path
    static_path = "/usr/local/google/home/jush/sukodu/frontend/dist"

if os.path.exists(static_path):
    app.mount("/", StaticFiles(directory=static_path, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"message": "Sudoku Quest Backend is running. Frontend has not been built yet."}
