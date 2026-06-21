import unittest

try:
    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool

    from app.auth import hash_password, verify_password
    from app.database import Base, get_db
    from app.main import app
except ModuleNotFoundError as error:
    if error.name in {"fastapi", "sqlalchemy", "httpx"}:
        raise unittest.SkipTest(f"{error.name} is not installed in this runtime.")
    raise


class AuthApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        Base.metadata.create_all(bind=self.engine)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=self.engine)

    def register(self, email="alex@example.com"):
        return self.client.post(
            "/auth/register",
            json={
                "name": "Alex Quest",
                "email": email,
                "password": "Strongpass1",
                "goal": "strength",
            },
        )

    def test_passwords_are_hashed_and_verified(self):
        stored_hash = hash_password("Strongpass1")

        self.assertNotEqual(stored_hash, "Strongpass1")
        self.assertTrue(verify_password("Strongpass1", stored_hash))
        self.assertFalse(verify_password("Wrongpass1", stored_hash))

    def test_registration_login_session_and_logout(self):
        register_response = self.register()
        self.assertEqual(register_response.status_code, 200)
        self.assertIn("token", register_response.json())

        duplicate_response = self.register()
        self.assertEqual(duplicate_response.status_code, 400)

        login_response = self.client.post(
            "/auth/login",
            json={"email": "alex@example.com", "password": "Strongpass1"},
        )
        self.assertEqual(login_response.status_code, 200)
        token = login_response.json()["token"]

        me_response = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["email"], "alex@example.com")

        logout_response = self.client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(logout_response.status_code, 200)

        protected_response = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(protected_response.status_code, 401)

    def test_protected_workouts_and_user_data_isolation(self):
        first = self.register("first@example.com").json()["token"]
        second = self.register("second@example.com").json()["token"]

        unauthenticated_response = self.client.get("/workouts")
        self.assertEqual(unauthenticated_response.status_code, 401)

        create_response = self.client.post(
            "/workouts",
            headers={"Authorization": f"Bearer {first}"},
            json={"exercise_type": "pushup", "amount": 20, "unit": "reps"},
        )
        self.assertEqual(create_response.status_code, 200)

        first_history = self.client.get("/workouts", headers={"Authorization": f"Bearer {first}"})
        second_history = self.client.get("/workouts", headers={"Authorization": f"Bearer {second}"})

        self.assertEqual(len(first_history.json()), 1)
        self.assertEqual(second_history.json(), [])


if __name__ == "__main__":
    unittest.main()
