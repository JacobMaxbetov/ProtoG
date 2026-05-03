import os
from flask import Flask, render_template, send_from_directory, request, redirect, g
import jwt
import sqlite3
import time

# Загружаем .env из корня проекта, если он есть
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '.env'))
if os.path.exists(env_path):
    with open(env_path, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value

app = Flask(__name__,
            template_folder='templates',
            static_folder='static')

JWT_SECRET = "твой_очень_длинный_секрет_2026"

def get_db():
    if 'db' not in g:
        # Полный путь к БД внутри папки backend
        db_path = os.path.join(os.path.dirname(__file__), 'protog.db')
        g.db = sqlite3.connect(db_path, timeout=30)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def get_current_user():
    token = request.args.get('token')
    
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
    
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        
        # Простая проверка срока действия
        if payload.get('exp', 0) < time.time():
            print("⏰ Token expired")
            return None
        
        # Проверяем наличие id и email
        if not payload.get('id') or not payload.get('email'):
            print("❌ Token missing id or email")
            return None
            
        return payload
        
    except Exception as e:
        print("❌ JWT error:", str(e))
        return None


@app.route('/lesson/<int:lesson_id>')
def view_lesson(lesson_id):
    frontend_url = os.environ.get('VITE_FRONTEND_URL', 'https://ably-flamboyant-python.cloudpub.ru/')
    user = get_current_user()
    if not user:
        return redirect(f"{frontend_url}?error=auth_required")

    try:
        db = get_db()
        
        # Проверяем, существует ли урок
        row = db.execute("""
            SELECT course_id 
            FROM lessons 
            WHERE id = ?
        """, (lesson_id,)).fetchone()

        if not row:
            return """
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Урок не найден</title>
                <style>
                    * {{
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }}
                    body {{
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }}
                    .container {{
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        padding: 60px 40px;
                        text-align: center;
                        max-width: 500px;
                        animation: slideUp 0.6s ease-out;
                    }}
                    @keyframes slideUp {{
                        from {{
                            opacity: 0;
                            transform: translateY(30px);
                        }}
                        to {{
                            opacity: 1;
                            transform: translateY(0);
                        }}
                    }}
                    .error-icon {{
                        font-size: 80px;
                        margin-bottom: 20px;
                        animation: bounce 0.6s ease-out;
                    }}
                    @keyframes bounce {{
                        0%%, 100%% {{
                            transform: translateY(0);
                        }}
                        50%% {{
                            transform: translateY(-10px);
                        }}
                    }}
                    .error-code {{
                        font-size: 48px;
                        font-weight: bold;
                        color: #667eea;
                        margin-bottom: 10px;
                    }}
                    h2 {{
                        font-size: 28px;
                        color: #333;
                        margin-bottom: 10px;
                    }}
                    p {{
                        font-size: 16px;
                        color: #666;
                        margin-bottom: 30px;
                        line-height: 1.5;
                    }}
                    .button {{
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        color: white;
                        padding: 14px 40px;
                        border-radius: 50px;
                        text-decoration: none;
                        font-size: 16px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        border: none;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    }}
                    .button:hover {{
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
                    }}
                    .button:active {{
                        transform: translateY(0);
                    }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">😕</div>
                    <div class="error-code">404</div>
                    <h2>Урок не найден</h2>
                    <p>К сожалению, урок с ID %s не существует или был удалён.</p>
                    <a href="%s" class="button">← Вернуться к курсам</a>
                </div>
            </body>
            </html>
            """ % (lesson_id, frontend_url), 404

        course_id = row['course_id']

        # Проверка покупки курса
        purchase = db.execute("""
            SELECT 1 FROM user_courses 
            WHERE user_id = ? AND course_id = ?
        """, (user['id'], course_id)).fetchone()

        if not purchase:
            return """
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Доступ запрещён</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        padding: 60px 40px;
                        text-align: center;
                        max-width: 500px;
                        animation: slideUp 0.6s ease-out;
                    }
                    @keyframes slideUp {
                        from {
                            opacity: 0;
                            transform: translateY(30px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .error-icon {
                        font-size: 80px;
                        margin-bottom: 20px;
                        animation: bounce 0.8s ease-out;
                    }
                    @keyframes bounce {
                        0%%, 100%% { transform: translateY(0); }
                        50%% { transform: translateY(-12px); }
                    }
                    .error-code {
                        font-size: 48px;
                        font-weight: bold;
                        color: #667eea;
                        margin-bottom: 10px;
                    }
                    h2 {
                        font-size: 28px;
                        color: #333;
                        margin-bottom: 12px;
                    }
                    p {
                        font-size: 16px;
                        color: #666;
                        margin-bottom: 30px;
                        line-height: 1.6;
                    }
                    .button {
                        display: inline-block;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        color: white;
                        padding: 14px 40px;
                        border-radius: 50px;
                        text-decoration: none;
                        font-size: 16px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    }
                    .button:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="error-icon">🔒</div>
                    <div class="error-code">403</div>
                    <h2>Доступ запрещён</h2>
                    <p>Вы не приобрели этот курс.<br>Чтобы получить доступ к уроку, пожалуйста, приобретите его.</p>
                    <a href="%s" class="button">← Вернуться к курсам</a>
                </div>
            </body>
            </html>
            """ % (frontend_url,), 403

        print(f"✅ User {user.get('email')} (id:{user.get('id')}) → lesson {lesson_id} (course {course_id})")
        return render_template(
            'lesson_viewer.html',
            lesson_id=lesson_id,
            frontend_url=os.environ.get('VITE_FRONTEND_URL', 'https://ably-flamboyant-python.cloudpub.ru/'),
            api_url=os.environ.get('VITE_API_URL', 'https://gallantly-conclusive-crocodile.cloudpub.ru/')
        )

    except Exception as e:
        print("Ошибка в /lesson:", e)
        return "<h2>Ошибка сервера</h2>", 500


@app.route('/content/lessons/<path:filename>')
def serve_lesson_content(filename):
    user = get_current_user()
    if not user:
        return "<h3>Нет доступа. Войдите в аккаунт.</h3>", 401
    
    try:
        return send_from_directory('../content/lessons', filename)
    except:
        return "<p>Материал урока не найден.</p>", 404


if __name__ == '__main__':
    app.run(debug=True, port=5551)