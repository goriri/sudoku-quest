from pydantic import BaseModel, Field
from typing import List, Optional

# --- Auth / User Schemas ---
class UserCreate(BaseModel):
    username: str
    password: str
    avatar: Optional[str] = "wizard"

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class InventoryItem(BaseModel):
    item_type: str
    quantity: int

    class Config:
        from_attributes = True

class UserProfile(BaseModel):
    id: int
    username: str
    avatar: str
    coins: int
    current_zone: int
    current_level: int
    xp: int
    inventory: List[InventoryItem]

    class Config:
        from_attributes = True

# --- Game Schemas ---
class GameStartRequest(BaseModel):
    size: int = Field(9, description="Grid size: 4, 6, or 9")
    difficulty: str = Field("easy", description="easy, medium, or hard")

class GameState(BaseModel):
    grid: List[List[int]]
    original_grid: List[List[int]]
    size: int
    difficulty: str
    stage: int
    hearts: int
    time_spent: int

    class Config:
        from_attributes = True

class GameMoveRequest(BaseModel):
    grid: List[List[int]]
    hearts: int
    time_spent: int

class GameSubmitRequest(BaseModel):
    grid: List[List[int]]

class GameSubmitResponse(BaseModel):
    success: bool
    correct: bool
    coins_earned: int
    new_level: int
    new_zone: int
    new_stage: int
    stage_completed: bool
    level_completed: bool
    xp_earned: int

# --- Shop Schemas ---
class ShopBuyRequest(BaseModel):
    item_type: str
    quantity: int = 1

class ShopBuyResponse(BaseModel):
    success: bool
    item_type: str
    quantity: int
    remaining_coins: int

# --- Cell Validation ---
class ValidateCellRequest(BaseModel):
    r: int
    c: int
    val: int

