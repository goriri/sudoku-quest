import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db
from backend.main import app
from backend import models, crud

# Setup Test Database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_db.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override get_db dependency
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    # Create tables
    Base.metadata.create_all(bind=engine)
    yield
    # Drop tables after test
    Base.metadata.drop_all(bind=engine)

def test_register_and_login():
    # Register user
    reg_response = client.post(
        "/api/auth/register",
        json={"username": "forestkid", "password": "supersecretpassword", "avatar": "knight"}
    )
    assert reg_response.status_code == 200
    data = reg_response.json()
    assert data["username"] == "forestkid"
    assert data["avatar"] == "knight"
    assert data["coins"] == 100

    # Test duplicate register
    dup_response = client.post(
        "/api/auth/register",
        json={"username": "forestkid", "password": "anotherpassword"}
    )
    assert dup_response.status_code == 400

    # Login
    login_response = client.post(
        "/api/auth/login",
        json={"username": "forestkid", "password": "supersecretpassword"}
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

def test_authenticated_profile():
    # Register & Login to get token
    client.post(
        "/api/auth/register",
        json={"username": "gamer", "password": "password123"}
    )
    login_res = client.post(
        "/api/auth/login",
        json={"username": "gamer", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch profile
    profile_res = client.get("/api/auth/profile", headers=headers)
    assert profile_res.status_code == 200
    profile = profile_res.json()
    assert profile["username"] == "gamer"
    assert len(profile["inventory"]) == 3

def test_game_flow():
    client.post(
        "/api/auth/register",
        json={"username": "sudokumaster", "password": "password123"}
    )
    login_res = client.post(
        "/api/auth/login",
        json={"username": "sudokumaster", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start a 4x4 game
    start_res = client.post("/api/game/start", json={"size": 4, "difficulty": "easy"}, headers=headers)
    assert start_res.status_code == 200
    state = start_res.json()
    assert len(state["grid"]) == 4
    assert state["hearts"] == 3
    assert state["time_spent"] == 0

    # Save progress with dummy grid state (modify one cell)
    updated_grid = [row[:] for row in state["grid"]]
    updated_grid[0][0] = 99  # Dummy move
    save_res = client.post(
        "/api/game/save",
        json={"grid": updated_grid, "hearts": 2, "time_spent": 42},
        headers=headers
    )
    assert save_res.status_code == 200
    saved_state = save_res.json()
    assert saved_state["grid"][0][0] == 99
    assert saved_state["hearts"] == 2
    assert saved_state["time_spent"] == 42

    # Get active game state
    state_res = client.get("/api/game/state", headers=headers)
    assert state_res.status_code == 200
    assert state_res.json()["time_spent"] == 42

def test_shop_and_use_items():
    client.post(
        "/api/auth/register",
        json={"username": "buyer", "password": "password123"}
    )
    login_res = client.post(
        "/api/auth/login",
        json={"username": "buyer", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Buy a wand (price: 30 coins). Starting coins is 100.
    buy_res = client.post("/api/shop/buy", json={"item_type": "hint_wand", "quantity": 2}, headers=headers)
    assert buy_res.status_code == 200
    buy_data = buy_res.json()
    assert buy_data["quantity"] == 2
    assert buy_data["remaining_coins"] == 40  # 100 - (30 * 2) = 40

    # Check inventory in profile
    profile_res = client.get("/api/auth/profile", headers=headers)
    profile = profile_res.json()
    wand_item = next(item for item in profile["inventory"] if item["item_type"] == "hint_wand")
    assert wand_item["quantity"] == 2

    # Use a wand
    use_res = client.post("/api/game/use-item?item_type=hint_wand", headers=headers)
    assert use_res.status_code == 200
    assert use_res.json()["success"] is True

    # Check inventory again
    profile_res2 = client.get("/api/auth/profile", headers=headers)
    profile2 = profile_res2.json()
    wand_item2 = next(item for item in profile2["inventory"] if item["item_type"] == "hint_wand")
    assert wand_item2["quantity"] == 1

def test_submit_game_failure_and_success():
    client.post(
        "/api/auth/register",
        json={"username": "solver", "password": "password123"}
    )
    login_res = client.post(
        "/api/auth/login",
        json={"username": "solver", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start a 4x4 game
    client.post("/api/game/start", json={"size": 4, "difficulty": "easy"}, headers=headers)

    # Let's get the active game object directly from test DB to find the correct solution
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.username == "solver").first()
    correct_solution = user.active_game.solution
    db.close()

    # Submit WRONG solution
    wrong_solution = [row[:] for row in correct_solution]
    # Induce an error by changing a number
    wrong_solution[0][0] = (wrong_solution[0][0] % 4) + 1 # offset it
    submit_wrong_res = client.post("/api/game/submit", json={"grid": wrong_solution}, headers=headers)
    assert submit_wrong_res.status_code == 200
    assert submit_wrong_res.json()["correct"] is False

    # Submit CORRECT solution
    submit_correct_res = client.post("/api/game/submit", json={"grid": correct_solution}, headers=headers)
    assert submit_correct_res.status_code == 200
    res_data = submit_correct_res.json()
    assert res_data["correct"] is True
    assert res_data["coins_earned"] > 0
    assert res_data["new_level"] == 2

    # Verify active game is cleaned up
    state_res = client.get("/api/game/state", headers=headers)
    assert state_res.status_code == 200
    assert state_res.json() is None

def test_validate_cell_and_hint():
    client.post(
        "/api/auth/register",
        json={"username": "validatorkid", "password": "password123"}
    )
    login_res = client.post(
        "/api/auth/login",
        json={"username": "validatorkid", "password": "password123"}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Start game
    client.post("/api/game/start", json={"size": 4, "difficulty": "easy"}, headers=headers)

    # Get solution directly to verify test checks
    db = TestingSessionLocal()
    user = db.query(models.User).filter(models.User.username == "validatorkid").first()
    correct_solution = user.active_game.solution
    db.close()

    # Validate cell correctly
    correct_val = correct_solution[0][0]
    val_correct_res = client.post(
        "/api/game/validate-cell",
        json={"r": 0, "c": 0, "val": correct_val},
        headers=headers
    )
    assert val_correct_res.status_code == 200
    assert val_correct_res.json()["correct"] is True

    # Validate cell incorrectly
    wrong_val = (correct_val % 4) + 1
    val_wrong_res = client.post(
        "/api/game/validate-cell",
        json={"r": 0, "c": 0, "val": wrong_val},
        headers=headers
    )
    assert val_wrong_res.status_code == 200
    assert val_wrong_res.json()["correct"] is False

    # Get hint
    hint_res = client.get("/api/game/hint?r=0&c=0", headers=headers)
    assert hint_res.status_code == 200
    assert hint_res.json()["val"] == correct_val

