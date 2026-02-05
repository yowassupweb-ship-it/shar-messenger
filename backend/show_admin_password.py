from db_adapter import db

user = db.get_user('admin')
print(f'Username: {user["username"]}')
print(f'Password: {user["password"]}')
print()
print('Попробуйте войти с этими данными:')
print(f'Логин: {user["username"]}')
print(f'Пароль: {user["password"]}')
