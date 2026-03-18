from pydantic import BaseModel

class LoginRequest(BaseModel):
    email: str
    password: str
    selected_role: str
class StudentSignup(BaseModel):
    name: str
    email: str
    password: str
    interests: str