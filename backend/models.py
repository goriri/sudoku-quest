from sqlalchemy import Column, Integer, String, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar = Column(String, default="wizard") # wizard, fairy, knight, elf
    coins = Column(Integer, default=100) # Initial free coins to buy items
    current_zone = Column(Integer, default=1) # 1: Whispering Woods, 2: Crystal Caves, 3: Cloud Castle
    current_level = Column(Integer, default=1) # 1 to max levels
    xp = Column(Integer, default=0)

    # Relationships
    inventory = relationship("Inventory", back_populates="owner", cascade="all, delete-orphan")
    active_game = relationship("ActiveGame", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Inventory(Base):
    __tablename__ = "inventories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_type = Column(String, nullable=False) # e.g. hint_wand, crystal_shield, hourglass
    quantity = Column(Integer, default=0)

    owner = relationship("User", back_populates="inventory")

class ActiveGame(Base):
    __tablename__ = "active_games"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    
    grid = Column(JSON, nullable=False) # 2D array representation of current state
    solution = Column(JSON, nullable=False) # 2D array representation of complete solution
    original_grid = Column(JSON, nullable=False) # 2D array representation of initial state
    
    size = Column(Integer, nullable=False) # 4, 6, 9
    difficulty = Column(String, nullable=False)
    hearts = Column(Integer, default=3)
    time_spent = Column(Integer, default=0) # in seconds

    user = relationship("User", back_populates="active_game")
