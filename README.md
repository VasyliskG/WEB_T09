# Практична робота № 9

## Тема: Реалізація автентифікації та рольової авторизації

## Варіант

**Варіант 1: гаджети та електроніка.** Проєкт продовжує практичну роботу № 8 (каталог гаджетів, бренди, фічі, гарантії, міграції TypeORM) і додає підсистему безпеки:

| Параметр | Реалізація |
|---|---|
| Ролі (`enum Role`) | `ADMIN`, `STORE_MANAGER`, `CUSTOMER` |
| Роль за замовчуванням | `CUSTOMER` (призначається під час `POST /auth/register`, клієнт не може її змінити) |
| Публічні ресурси (`@Public()`) | перегляд гаджетів, брендів і фіч (`GET /gadgets*`, `GET /brands*`, `GET /features`) |
| Привілейовані операції (`@Roles()`) | створення, редагування й видалення гаджетів, брендів і фіч: `STORE_MANAGER`, `ADMIN` |
| Лише `ADMIN` | фізичне (незворотне) видалення `DELETE /gadgets/:id/permanent` |
| Будь-який автентифікований | `GET/POST /orders`, `GET /auth/me` |

## Стек

NestJS 11, TypeORM, PostgreSQL 16 (Docker), `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `cookie-parser`, `class-validator`.

## Структура

```text
docker-compose.yml                  # postgres:16-alpine, контейнер nest_store_db_t09, порт 5434
.env.example                        # БД, JWT-секрети/TTL, облікові дані для seed
requests.http                       # повний сценарій для REST Client (токени підставляються автоматично)
docs/logs/                          # логи старту та прогону сценарію
src/
├── main.ts                         # app.use(cookieParser())
├── app.module.ts                   # + UsersModule, AuthModule
├── config/auth.config.ts           # секрети, TTL (15m / 7d), saltRounds = 10
├── users/
│   ├── enums/role.enum.ts          # Role { ADMIN, STORE_MANAGER, CUSTOMER }
│   ├── entities/user.entity.ts     # UserEntity (passwordHash і hashedRefreshToken: select: false)
│   ├── users.service.ts            # робота з репозиторієм + toPublic() без секретних полів
│   └── users.module.ts
├── auth/
│   ├── auth.module.ts              # JwtModule, PassportModule, APP_GUARD: JwtAuthGuard -> RolesGuard
│   ├── auth.controller.ts          # register, login, me, refresh, logout; HttpOnly cookie
│   ├── auth.service.ts             # bcrypt, видача та ротація пари токенів
│   ├── dto/{register,login}.dto.ts # валідація email та пароля
│   ├── strategies/jwt.strategy.ts  # Bearer-токен -> req.user
│   ├── guards/jwt-auth.guard.ts    # глобальний, пропускає @Public()
│   ├── guards/roles.guard.ts       # Reflector + ForbiddenException
│   ├── decorators/                 # @CurrentUser(), @Public(), @Roles()
│   └── interfaces/jwt-payload.interface.ts
├── database/
│   ├── migrations/…-CreateUsers.ts # enum users_role_enum + таблиця users
│   └── seeds/users.seed.ts         # створення ADMIN і STORE_MANAGER
├── gadgets/ brands/ features/      # контролери позначено @Public() / @Roles()
└── orders/ warranties/ shared/ common/   # без змін з ПР № 8
```

## Запуск

```bash
cp .env.example .env            # обов'язково замінити JWT_*_SECRET на випадкові рядки
docker compose up -d            # PostgreSQL на localhost:5434
npm install
npm run migration:run           # у т.ч. CreateUsers
npm run seed:users              # admin@example.com / manager@example.com (паролі з .env)
npm run start:dev               # http://localhost:3000
```

Згенерувати секрети: `openssl rand -hex 32`.

Через публічну реєстрацію можна отримати тільки роль `CUSTOMER`, тому адміністратора й менеджера створює окремий скрипт `seed:users`. Він ідемпотентний: повторний запуск оновлює пароль і роль.

## Ендпоінти

| Метод | Маршрут | Доступ | Відповідь |
|---|---|---|---|
| POST | `/auth/register` | public | 201 `{ id, email, role, createdAt, updatedAt }`, 409 якщо email зайнятий |
| POST | `/auth/login` | public | 200 `{ accessToken }` + `Set-Cookie: refreshToken`, 401 «Невірні облікові дані» |
| GET | `/auth/me` | auth | 200 профіль без `passwordHash` |
| POST | `/auth/refresh` | cookie | 200 нова пара: `{ accessToken }` + новий `Set-Cookie` |
| POST | `/auth/logout` | cookie | 204, `hashedRefreshToken = NULL`, cookie видалено |
| GET | `/gadgets`, `/gadgets/:id`, `/gadgets/:id/full` | public | |
| POST/PATCH/PUT/DELETE | `/gadgets…` | `ADMIN`, `STORE_MANAGER` | 403 для `CUSTOMER` |
| DELETE | `/gadgets/:id/permanent` | `ADMIN` | 403 для менеджера |
| GET | `/brands`, `/brands/:id`, `/features` | public | |
| POST/DELETE | `/brands…`, POST `/features` | `ADMIN`, `STORE_MANAGER` | |
| GET/POST | `/orders` | auth | |

## Рівень 1. Користувачі, реєстрація, логін, `/auth/me`

- `UserEntity`: `id` (uuid), `email` (`UNIQUE`), `passwordHash`, `role` (PostgreSQL `enum`, default `CUSTOMER`), `hashedRefreshToken` (nullable), `createdAt`, `updatedAt`. Схему створює міграція `CreateUsers` (`synchronize` вимкнено, як і в ПР № 8).
- Поля `passwordHash` і `hashedRefreshToken` мають `select: false`: звичайні `find*` їх не повертають. Для логіну й refresh сервіс явно додає їх через `addSelect`. Клієнт отримує тільки результат `UsersService.toPublic()`.
- `RegisterDto` перевіряє email, пароль довжиною 6–72 символи, де є хоча б одна літера та одна цифра. Email приводиться до нижнього регістру. Глобальний `ValidationPipe` з `forbidNonWhitelisted` відхиляє зайві поля, тож передати `"role": "ADMIN"` при реєстрації не вийде (400).
- Пароль хешується через `bcrypt.hash(password, 10)`. При логіні `bcrypt.compare()`. Якщо email не знайдено або пароль невірний, повертається однакова помилка `401 Невірні облікові дані`, щоб не можна було перевірити, які email зареєстровані.
- Payload access-токена: `{ sub: user.id, email, role }`. `JwtStrategy` дістає Bearer-токен із заголовка `Authorization`, перевіряє підпис і строк дії, а `validate()` записує `{ id, email, role }` у `req.user`.

## Рівень 2. Декоратори та RBAC

- `@CurrentUser()` повертає весь `req.user`, а `@CurrentUser('id')` окреме поле (використано в `GET /auth/me`).
- `@Public()` встановлює метадані `isPublic`.
- `@Roles(...roles)` встановлює метадані `roles`.
- Обидва гарди зареєстровані глобально через `APP_GUARD` в `AuthModule` і виконуються в порядку реєстрації:
  1. `JwtAuthGuard` (`AuthGuard('jwt')`) через `Reflector.getAllAndOverride` перевіряє `isPublic`. Публічні маршрути пропускає, для решти вимагає валідний токен, інакше 401.
  2. `RolesGuard` читає `roles`. Якщо їх немає, пропускає. Якщо роль з `req.user` не входить до списку, кидає `ForbiddenException('Недостатньо прав для виконання операції')`.
- Новий контролер за замовчуванням закритий: щоб маршрут став публічним, його треба явно позначити `@Public()`.

## Рівень 3. Refresh token у HttpOnly cookie

| Токен | Секрет | TTL | Де живе |
|---|---|---|---|
| access | `JWT_ACCESS_SECRET` | 15 хв | тіло відповіді → `Authorization: Bearer` |
| refresh | `JWT_REFRESH_SECRET` | 7 днів | `Set-Cookie: refreshToken; HttpOnly; SameSite=Strict; Path=/auth` (+ `Secure` у production) |

- **Login.** Сервер генерує пару токенів, зберігає хеш refresh у `users.hashedRefreshToken` і віддає refresh-токен тільки в cookie.
- **Refresh.** Сервер читає `req.cookies.refreshToken` і перевіряє його через `JwtService.verifyAsync()` з refresh-секретом. Далі знаходить користувача і звіряє токен з `hashedRefreshToken` через `bcrypt.compare()`. Якщо все збігається, видає нову пару, перезаписує хеш (ротація) і заново встановлює cookie.
- **Виявлення повторного використання.** Якщо підпис refresh-токена валідний, але хеш у БД уже інший, значить цей токен уже був ротований і ним користується хтось сторонній. У такому разі сесія анулюється повністю (`hashedRefreshToken = NULL`), і новий токен теж перестає працювати.
- **Logout.** Сервер очищає `hashedRefreshToken` і викликає `res.clearCookie('refreshToken', …)` з тими самими `path` та `sameSite`. Маршрут працює за cookie, а не за access-токеном, тому вийти можна і тоді, коли access-токен уже прострочений.
- **Чому SHA-256 перед bcrypt.** bcrypt враховує тільки перші 72 байти входу. JWT довший, а його початок (header і `sub`) однаковий у всіх токенів одного користувача, тож без попередньої обробки старий токен проходив би `bcrypt.compare` з хешем нового. Тому в bcrypt передається `sha256(token)` (64 символи). У refresh-payload також є випадковий `jti`, щоб два токени, видані в одну секунду, гарантовано відрізнялися.
- Access-токен після logout діє до кінця своїх 15 хвилин. Це властивість stateless JWT, і саме тому строк його дії короткий.

## Перевірка

Повний прогін сценарію через curl лежить у [`docs/logs/auth-rbac-scenario.log`](docs/logs/auth-rbac-scenario.log), лог старту у [`docs/logs/startup.log`](docs/logs/startup.log). Фрагмент:

```text
== customer POST gadget
{"statusCode":403,"message":"Недостатньо прав для виконання операції","error":"Forbidden"}
== manager DELETE permanent (ADMIN only)
{"statusCode":403,"message":"Недостатньо прав для виконання операції"}
== refresh
HTTP/1.1 200 OK
Set-Cookie: refreshToken=eyJhbGciOiJI...; Max-Age=604800; Path=/auth; Expires=...; HttpOnly; SameSite=Strict
rotated: yes
== refresh with OLD token (reuse)
{"statusCode":401,"message":"Refresh token відкликано"}
== login again -> logout
HTTP/1.1 204 No Content
Set-Cookie: refreshToken=; Path=/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict
== refresh after logout
{"statusCode":401,"message":"Сесію завершено"}
```

## Скриншоти

> Файли покласти в `docs/screenshots/`.

### 1. Старт сервера: `AuthController {/auth}` і маршрути
![Старт](docs/screenshots/01-startup.png)

### 2. Реєстрація → 201, роль `CUSTOMER`
![Реєстрація](docs/screenshots/02-register.png)

### 3. Логін → `accessToken` + `Set-Cookie` з `HttpOnly`
![Логін](docs/screenshots/03-login-cookie.png)

### 4. `GET /auth/me`
![Профіль](docs/screenshots/04-me.png)

### 5. Покупець `POST /gadgets` → 403 Forbidden
![403](docs/screenshots/05-forbidden.png)

### 6. Менеджер `POST /gadgets` → 201
![201](docs/screenshots/06-manager-create.png)

### 7. `POST /auth/refresh` → новий `Set-Cookie`
![Refresh](docs/screenshots/07-refresh.png)

### 8. Logout → 204, повторний refresh → 401
![Logout](docs/screenshots/08-logout.png)

### 9. Таблиця `users` у БД (хеші bcrypt, `hashedRefreshToken = NULL` після logout)
![БД](docs/screenshots/09-users-table.png)

## Контрольні питання

1. **Чому не можна зберігати паролі відкрито або через MD5/SHA-256.** Після витоку бази відкриті паролі одразу стають доступні, а користувачі часто використовують ті самі паролі на інших сайтах. MD5 і SHA-256 задумані як швидкі функції: GPU перебирає мільярди варіантів за секунду, а для несолених хешів існують готові райдужні таблиці. `bcrypt` навмисно повільний (cost factor, `2^10` раундів), складність можна підвищувати, і він має вбудовану сіль.
2. **Сіль.** Це випадковий рядок, унікальний для кожного пароля, який змішується з паролем перед хешуванням і зберігається разом із хешем (`$2b$10$<22 символи солі><хеш>`). Сіль захищає від райдужних таблиць і від атаки одразу на всю базу, бо однакові паролі дають різні хеші і кожен пароль доводиться підбирати окремо.
3. **Складові JWT.** Токен має вигляд `Header.Payload.Signature`, перші дві частини закодовані в base64url. *Header* містить алгоритм і тип: `{"alg":"HS256","typ":"JWT"}`. *Payload* містить claims: `sub`, `email`, `role`, `iat`, `exp` (у refresh ще `jti`). Payload не шифрується, тому секретів у ньому бути не повинно. *Signature* обчислюється як `HMAC-SHA256(header + "." + payload, secret)` і гарантує, що токен не змінювали.
4. **Автентифікація чи авторизація.** Автентифікація відповідає на питання «хто ти?»: перевірка пароля, валідація JWT, відповідь 401. Авторизація відповідає на питання «що тобі дозволено?»: перевірка ролі в `RolesGuard`, відповідь 403. Автентифікація завжди йде першою.
5. **`PassportStrategy` і `validate()`.** Стратегія описує, як дістати облікові дані із запиту (`ExtractJwt.fromAuthHeaderAsBearerToken()`) і як їх перевірити (секрет, `ignoreExpiration: false`). `validate()` викликається на етапі гардів, тобто після middleware, але до інтерсепторів, пайпів і обробника, і тільки якщо підпис і строк дії токена вже перевірені. Те, що вона повертає, Passport записує в `req.user`.
6. **`localStorage` проти `HttpOnly`.** Будь-який JavaScript на сторінці може прочитати `localStorage`, тож одна XSS-вразливість (або скомпрометований npm-пакет на фронтенді) дає змогу вкрасти токен. Cookie з прапорцем `HttpOnly` недоступна через `document.cookie`, браузер лише сам додає її до запитів. `SameSite=Strict` не дає надіслати її з чужого сайту (захист від CSRF), `Path=/auth` обмежує, куди її взагалі надсилати, а `Secure` дозволяє передавати її тільки через HTTPS.
7. **RBAC через `SetMetadata` і `Reflector`.** `@Roles(Role.ADMIN, …)` викликає `SetMetadata('roles', [...])`, і масив ролей зберігається в метаданих методу або класу. `RolesGuard` через `ExecutionContext` отримує обробник і клас, а `reflector.getAllAndOverride('roles', [handler, class])` повертає метадані методу, якщо вони є, інакше класу. Далі гард порівнює їх з `req.user.role`. Так правила доступу задаються декларативно, а логіка перевірки живе в одному місці.
8. **Навіщо два токени.** Access-токен перевіряється без звернення до БД, тому його неможливо відкликати до кінця строку дії. Якщо його вкрадуть, зловмисник матиме лише 15 хвилин. Refresh-токен живе довго, але сервер перевіряє його за БД, тож його можна відкликати (logout, ротація), і він ніколи не потрапляє в JavaScript. Виходить і швидка перевірка звичайних запитів, і контроль над сесією.
9. **Ротація і хешування refresh-токена.** Кожен `/auth/refresh` видає нову пару і перезаписує хеш у БД, тому старий токен стає недійсним. Якщо хтось пред'явить старий токен з валідним підписом, це ознака крадіжки, і сервер анулює всю сесію. Хешувати refresh-токен потрібно з тієї ж причини, що й пароль: після витоку таблиці `users` зловмисник отримає тільки хеші й не зможе ними користуватися. Тут використано bcrypt над SHA-256 від токена через обмеження bcrypt у 72 байти.
