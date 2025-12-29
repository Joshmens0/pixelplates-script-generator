import sqlalchemy
from sqlalchemy import create_engine
from database import Base, engine
from models import User

# This will create any tables that don't exist yet (like 'users')
# It won't modify existing tables (scripts), which is fine for now.
# We are not enforcing a hard foreign key constraint on 'scripts.user_id' -> 'users.id'
# in the database schema to avoid complex migrations of existing data, 
# but the app logic will enforce it.

def migrate_users():
    print("Creating 'users' table if it doesn't exist...")
    Base.metadata.create_all(bind=engine)
    print("Done.")

if __name__ == "__main__":
    migrate_users()
