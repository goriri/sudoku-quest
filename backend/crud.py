from sqlalchemy.orm import Session
from backend import models, schemas, auth
from backend.sudoku_logic import SudokuLogic
import json

# Item price catalog
ITEM_PRICES = {
    "hint_wand": 30,
    "crystal_shield": 50,
    "hourglass": 20
}

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        avatar=user.avatar,
        coins=100, # starting coins
        current_zone=1,
        current_level=1,
        xp=0
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    # Initialize empty inventory items
    for item in ITEM_PRICES.keys():
        inv_item = models.Inventory(user_id=db_user.id, item_type=item, quantity=0)
        db.add(inv_item)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_user_profile(db: Session, user: models.User):
    # Ensure inventory matches items list in case of changes
    for item in ITEM_PRICES.keys():
        exists = db.query(models.Inventory).filter(
            models.Inventory.user_id == user.id,
            models.Inventory.item_type == item
        ).first()
        if not exists:
            inv_item = models.Inventory(user_id=user.id, item_type=item, quantity=0)
            db.add(inv_item)
    db.commit()
    db.refresh(user)
    return user

def create_active_game(db: Session, user: models.User, size: int, difficulty: str):
    # Clean up old game
    if user.active_game:
        db.delete(user.active_game)
        db.commit()

    # Generate Sudoku board
    sl = SudokuLogic(size=size)
    puzzle, solution = sl.generate_puzzle(difficulty)

    db_game = models.ActiveGame(
        user_id=user.id,
        grid=puzzle,
        solution=solution,
        original_grid=puzzle,
        size=size,
        difficulty=difficulty,
        hearts=3,
        time_spent=0
    )
    db.add(db_game)
    db.commit()
    db.refresh(db_game)
    return db_game

def update_active_game(db: Session, game: models.ActiveGame, move: schemas.GameMoveRequest):
    game.grid = move.grid
    game.hearts = move.hearts
    game.time_spent = move.time_spent
    db.commit()
    db.refresh(game)
    return game

def delete_active_game(db: Session, game: models.ActiveGame):
    db.delete(game)
    db.commit()

def buy_item(db: Session, user: models.User, item_type: str, quantity: int):
    if item_type not in ITEM_PRICES:
        return None, "Item does not exist"
    
    cost = ITEM_PRICES[item_type] * quantity
    if user.coins < cost:
        return None, "Insufficient coins"

    # Subtract coins
    user.coins -= cost

    # Add to inventory
    inventory_item = db.query(models.Inventory).filter(
        models.Inventory.user_id == user.id,
        models.Inventory.item_type == item_type
    ).first()

    if inventory_item:
        inventory_item.quantity += quantity
    else:
        inventory_item = models.Inventory(user_id=user.id, item_type=item_type, quantity=quantity)
        db.add(inventory_item)

    db.commit()
    db.refresh(user)
    return inventory_item, None

def use_item(db: Session, user: models.User, item_type: str):
    inventory_item = db.query(models.Inventory).filter(
        models.Inventory.user_id == user.id,
        models.Inventory.item_type == item_type
    ).first()

    if not inventory_item or inventory_item.quantity <= 0:
        return False, "You do not own this item"

    inventory_item.quantity -= 1
    db.commit()
    db.refresh(user)
    return True, None
