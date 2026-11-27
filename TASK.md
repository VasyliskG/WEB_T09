# Практична робота № 9

## Тема: Реалізація автентифікації та рольової авторизації

---

## Мета роботи

- Опанувати принципи побудови безпечної підсистеми автентифікації та авторизації у серверних застосунках NestJS.
- Навчитися безпечно хешувати та верифікувати паролі користувачів за допомогою бібліотеки `bcrypt`.
- Засвоїти роботу з протоколом JSON Web Token (JWT), налаштувати генерацію та підписування токенів за допомогою `@nestjs/jwt`.
- Навчитися захищати маршрути контролерів за допомогою бібліотеки `@nestjs/passport` та стратегії `passport-jwt`.
- Опанувати створення кастомних параметричних декораторів (`@CurrentUser()`) та метаданих (`@Public()`).
- Спроєктувати та реалізувати систему рольового контролю доступу (Role-Based Access Control — RBAC) за допомогою перелічень (`enum`), рефлексії метаданих (`Reflector`) та авторизаційних гардів (`RolesGuard`).
- Реалізувати безпечну ротацію сесій за схемою подвійних токенів (Access Token у відповіді + Refresh Token у захищеному заголовку `HttpOnly Cookie`) та анулювання сесії (`Logout`).

---

## Технічне забезпечення

- Операційна система: Windows, macOS або Linux.
- Середовище розробки: Visual Studio Code (із розширенням REST Client або аналогами).
- Платформа виконання: Node.js версії 18+ (LTS) та пакетний менеджер npm.
- Контейнеризація: Docker Engine та Docker Compose (V2) із запущеним контейнером PostgreSQL.
- Бібліотеки бекенду: NestJS, `@nestjs/typeorm`, `typeorm`, `pg`, `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt`, `cookie-parser`, `@types/cookie-parser`, `@types/bcrypt`.
- Інструменти тестування API: Postman або файл `requests.http` для REST Client.
- Термінал / CLI: bash, zsh або PowerShell.
- Система контролю версій: Git.

---

## Короткі теоретичні відомості

### 1. Хешування паролів за допомогою `bcrypt`

Паролі користувачів ніколи не зберігаються у відкритому вигляді. Для захисту від атак за словником та райдужних таблиць використовується адаптивна функція хешування `bcrypt`, що генерує унікальну криптографічну сіль (`salt`) для кожного пароля:

```typescript
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Хешування під час реєстрації
const passwordHash = await bcrypt.hash(plainPassword, SALT_ROUNDS);

// Перевірка відповідності під час логіну
const isMatch = await bcrypt.compare(plainPassword, passwordHash);
```

---

### 2. Архітектура JWT (JSON Web Token) та Passport Strategy

JSON Web Token складається з трьох частин: `Header.Payload.Signature`. Після успішної перевірки облікових даних сервер формує токен із корисним навантаженням (`payload`), що містить ідентифікатор користувача та його роль.

Для перехоплення та валідації токенів у вхідних запитах створюється стратегія Passport:

```typescript
// jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'accessSecretKey',
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

Об'єкт, повернутий методом `validate()`, автоматично записується у `req.user` і стає доступним у контролерах.

---

### 3. Кастомні декоратори: `@CurrentUser()` та `@Public()`

Для вилучення поточного користувача безпосередньо у параметрах контролера оголошується кастомний декоратор:

```typescript
// current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
```

Для вибіркового відкриття публічних маршрутів при використанні глобального гарда використовується маркер метаданих:

```typescript
// public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

---

### 4. Рольова авторизація (RBAC) через `RolesGuard`

Авторизація контролює права користувача на виконання дії. Для цього оголошуються ролі та гард, що перевіряє збіг ролі користувача з дозволеними метаданими маршруту:

```typescript
// roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user?.role);
  }
}
```

---

### 5. Сесії з Refresh Token через захищені `HttpOnly Cookie`

Для мінімізації ризиків викрадення токенів застосовується схема ротації:
1. **Access Token** має короткий час життя (наприклад, 15 хвилин) і повертається у тілі відповіді JSON для авторизації запитів через заголовок `Authorization: Bearer <token>`.
2. **Refresh Token** має тривалий час життя (наприклад, 7 днів), хешується та записується в базу даних (`hashedRefreshToken`), а клієнту передається виключно через заголовок `Set-Cookie` з прапорцем `HttpOnly`. Це унеможливлює доступ до нього з боку зловмисних клієнтських скриптів (XSS).

Підключення `cookie-parser` у точці входу:

```typescript
// main.ts
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  await app.listen(3000);
}
bootstrap();
```

Відправка Refresh Token у захищеній cookie при логіні:

```typescript
@Post('login')
async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
  const { accessToken, refreshToken } = await this.authService.login(dto);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 днів
  });

  return { accessToken };
}
```

---

## Постановка задачі

Розширити розроблену систему каталогу товарів інтернет-магазину повноцінною підсистемою безпеки: створити сутність користувача з ролями, реалізувати реєстрацію та автентифікацію через JWT, налаштувати захист маршрутів API та розмежувати доступ до керування ресурсами каталогу за ролями відповідно до свого варіанта.

У межах практичної роботи необхідно:

1. Створити сутність `UserEntity` з обов'язковими полями: ідентифікатор, електронна пошта (унікальна), хеш пароля, роль (`enum`) та поле для збереження хешу refresh токена.
2. Реалізувати реєстрацію користувача з валідацією email, вимог до складності пароля та хешуванням через `bcrypt`.
3. Реалізувати логін з видачею підписаного JWT Access Token.
4. Налаштувати `JwtStrategy` та захистити ендпоінти отримання профілю `GET /auth/me`.
5. Створити декоратори `@CurrentUser()` та `@Public()`, налаштувати `JwtAuthGuard`.
6. Реалізувати механізм RBAC: декоратор `@Roles()` та авторизаційний перехоплювач `RolesGuard`.
7. Закрити мутуючі маршрути товарів (створення, редагування, видалення) для звичайних користувачів та дозволити їх виключно адміністративним ролям.
8. Реалізувати безпечний життєвий цикл сесії: випуск `refreshToken` у захищеному заголовку `Set-Cookie` (`httpOnly`), ротацію пари токенів на маршруті `POST /auth/refresh` та видалення cookie й очищення хешу в базі під час виходу `POST /auth/logout`.

Параметри сутності користувача, ролі та правила доступу визначаються індивідуальним *варіантом за номером у журналі*:

### Таблиця варіантів рольового доступу

| Варіант | Предметна область | Ролі користувачів (Enum `Role`) | Публічні ресурси (Public) | Привілейовані операції (RBAC) |
|---|---|---|---|---|
| **1** | Гаджети та електроніка | `ADMIN`, `STORE_MANAGER`, `CUSTOMER` | Перегляд товарів та брендів | Додавання/видалення товарів (`MANAGER`, `ADMIN`) |
| **2** | Книжковий онлайн-магазин | `ADMIN`, `EDITOR`, `READER` | Перегляд книг та жанрів | Керування каталогом книг (`EDITOR`, `ADMIN`) |
| **3** | Одяг та взуття | `ADMIN`, `STYLIST`, `BUYER` | Перегляд колекцій та речей | Додавання нових колекцій (`STYLIST`, `ADMIN`) |
| **4** | Ресторан та доставка їжі | `ADMIN`, `CHEF`, `CLIENT` | Перегляд меню та алергенів | Редагування страв та стоп-листа (`CHEF`, `ADMIN`) |
| **5** | Онлайн-аптека | `ADMIN`, `PHARMACIST`, `PATIENT` | Перегляд безрецептурних ліків | Керування рецептурними ліками (`PHARMACIST`, `ADMIN`) |
| **6** | Будівельні матеріали | `ADMIN`, `SUPPLIER`, `BUILDER` | Перегляд каталогу матеріалів | Оновлення залишків та паспортів (`SUPPLIER`, `ADMIN`) |
| **7** | Автозапчастини | `ADMIN`, `MECHANIC`, `DRIVER` | Пошук запчастин за авто | Додавання кодів сумісності (`MECHANIC`, `ADMIN`) |
| **8** | Квитки на події | `ADMIN`, `ORGANIZER`, `GUEST` | Перегляд афіші та подій | Створення подій та типів квитків (`ORGANIZER`, `ADMIN`) |
| **9** | Онлайн-курси | `ADMIN`, `INSTRUCTOR`, `STUDENT` | Перегляд програми курсів | Створення курсів та сертифікатів (`INSTRUCTOR`, `ADMIN`) |
| **10** | Зоотовари | `ADMIN`, `VET_CONSULTANT`, `PET_OWNER` | Каталог кормів та іграшок | Редагування раціонів та лікувальних лінійок (`VET`, `ADMIN`) |

---

## Завдання

Практична робота складається з трьох послідовних рівнів. Кожен наступний рівень базується на попередньому та розширює функціональність розроблюваного рішення.

### Рівень 1. Базовий

1. **Сутність користувача та модуль автентифікації:**
   - Створити модуль `UsersModule` та сутність `UserEntity` (`id`, `email`, `passwordHash`, `role`, `createdAt`, `updatedAt`).
   - Створити `AuthModule` та підключити `@nestjs/jwt` і `@nestjs/passport`.
2. **Реєстрація та логін:**
   - Реалізувати ендпоінт `POST /auth/register`:
     - Валідація коректності email та складності пароля (мінімум 6 символів);
     - Перевірка унікальності email (при конфлікті викидати `ConflictException`);
     - Хешування пароля за допомогою `bcrypt.hash()` із солінням (salt rounds >= 10);
     - Збереження користувача з базовою роллю покупця/клієнта згідно з варіантом.
   - Реалізувати ендпоінт `POST /auth/login`:
     - Пошук користувача за email;
     - Верифікація пароля за допомогою `bcrypt.compare()`;
     - У разі невідповідності повертати `UnauthorizedException('Невірні облікові дані')`;
     - Генерація JWT Access Token із корисним навантаженням `{ sub: user.id, email: user.email, role: user.role }`.
3. **Захист маршруту профілю:**
   - Створити `JwtStrategy`, яка витягує Bearer-токен із заголовка `Authorization`.
   - Створити охоронець `JwtAuthGuard` на основі `AuthGuard('jwt')`.
   - Реалізувати ендпоінт `GET /auth/me`, захищений `JwtAuthGuard`, який повертає інформацію про авторизованого користувача (без поля `passwordHash`).

### Рівень 2. Середній

1. **Кастомні інженерні декоратори:**
   - Створити параметричний декоратор `@CurrentUser()`, що дозволяє зручно отримувати сутність авторизованого користувача або окреме його поле (`@CurrentUser('id') userId: string`) у контролерах.
   - Створити маркерний декоратор `@Public()`, що встановлює метадані відкритого маршруту.
   - Налаштувати глобальний `JwtAuthGuard`, який автоматично перевіряє токен для всіх маршрутів застосунку, крім тих, що позначені декоратором `@Public()`.
2. **Рольовий контроль доступу (RBAC):**
   - Оголосити декоратор `@Roles(...roles: Role[])`, який записує дозволені ролі у метадані обробника через `SetMetadata`.
   - Реалізувати `RolesGuard`, який аналізує ролі користувача у `req.user` та порівнює їх з дозволеними ролями маршруту за допомогою `Reflector`. У разі невідповідності повертати помилку `ForbiddenException('Недостатньо прав для виконання операції')`.
3. **Захист каталогу інтернет-магазину:**
   - Позначити публічні маршрути перегляду товарів (`GET /items`, `GET /items/:id`) декоратором `@Public()`.
   - Захистити мутуючі маршрути (`POST /items`, `PATCH /items/:id`, `DELETE /items/:id`) за допомогою `@Roles()`, обмеживши доступ виключно адміністративними ролями відповідно до свого варіанта.
   - Протестувати спробу створення/видалення товару з токеном звичайного користувача та переконатися в отриманні HTTP 403 Forbidden.

### Рівень 3. Просунутий

1. **Організація сесій через `HttpOnly Cookie`:**
   - Підключити проміжний обробник `cookie-parser` у файлі `main.ts`.
   - Додати у `UserEntity` необов'язкове поле `hashedRefreshToken` (`varchar`, `nullable: true`).
   - Під час виконання логіну генерувати пару токенів:
     - `accessToken`: час життя 15 хвилин;
     - `refreshToken`: час життя 7 днів з окремим секретним ключем `JWT_REFRESH_SECRET`.
   - Зберегти захешований `refreshToken` у базі даних (`bcrypt.hash`) для поточного користувача.
   - Встановити `refreshToken` у відповідь клієнту через захищений заголовок `Set-Cookie` з атрибутами `httpOnly: true`, `sameSite: 'strict'`, `path: '/auth'`.
2. **Оновлення токенів (`POST /auth/refresh`):**
   - Реалізувати маршрут оновлення сесії, який зчитує `refreshToken` безпосередньо з об'єкта `req.cookies`.
   - Перевірити валідність токена за допомогою `JwtService.verifyAsync()`.
   - Знайти користувача в БД, звірити наданий токен із хешем `hashedRefreshToken` через `bcrypt.compare()`.
   - Згенерувати нову пару токенів, оновити хеш у базі (ротація токенів), перевстановити cookie та повернути новий `accessToken`.
3. **Завершення сесії (`POST /auth/logout`):**
   - Реалізувати ендпоінт виходу, який очищає поле `hashedRefreshToken` у базі даних користувача (`null`) та видаляє cookie через `res.clearCookie('refreshToken')`.
   - Продемонструвати у REST-клієнті повний сценарій: Логін ➔ Отримання даних ➔ Оновлення сесії через Cookie ➔ Логаут ➔ Неможливість повторного оновлення за старим токеном.

---

## Приклад очікуваного виведення програми

```text
[Nest] 42100  - 09/09/2026, 22:40:00     LOG [NestFactory] Starting Nest application...
[Nest] 42100  - 09/09/2026, 22:40:00     LOG [TypeOrmModule] Database connection established successfully (PostgreSQL 16) +35ms
[Nest] 42100  - 09/09/2026, 22:40:00     LOG [RoutesResolver] AuthController {/auth}: +3ms
[Nest] 42100  - 09/09/2026, 22:40:00     LOG [RoutesResolver] GadgetsController {/gadgets}: +2ms
[Nest] 42100  - 09/09/2026, 22:40:00     LOG [NestApplication] Nest application successfully started on port 3000 +2ms

=== 1. РЕЄСТРАЦІЯ КОРИСТУВАЧА ===

> POST /auth/register HTTP/1.1
> Host: localhost:3000
> Content-Type: application/json

{
  "email": "buyer@example.com",
  "password": "strongPassword123"
}

< HTTP/1.1 201 Created
{
  "id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "email": "buyer@example.com",
  "role": "CUSTOMER",
  "createdAt": "2026-09-09T22:41:00.000Z"
}

=== 2. ЛОГІН ТА ОТРИМАННЯ HTTPONLY COOKIE ===

> POST /auth/login HTTP/1.1
> Host: localhost:3000
> Content-Type: application/json

{
  "email": "buyer@example.com",
  "password": "strongPassword123"
}

< HTTP/1.1 200 OK
< Set-Cookie: refreshToken=eyJhbGciOi...; Path=/auth; HttpOnly; SameSite=Strict
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

=== 3. ПЕРЕВІРКА РОЛЬОВОГО ДОСТУПУ (RBAC) ЗВИЧАЙНОГО КОРИСТУВАЧА ===

> POST /gadgets HTTP/1.1
> Host: localhost:3000
> Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
> Content-Type: application/json

{
  "title": "Новий смартфон",
  "price": 25000
}

< HTTP/1.1 403 Forbidden
{
  "statusCode": 403,
  "message": "Недостатньо прав для виконання операції",
  "error": "Forbidden"
}

=== 4. ОНОВЛЕННЯ СЕСІЇ ЧЕРЕЗ REFRESH TOKEN (COOKIE) ===

> POST /auth/refresh HTTP/1.1
> Host: localhost:3000
> Cookie: refreshToken=eyJhbGciOi...

< HTTP/1.1 200 OK
< Set-Cookie: refreshToken=eyJhbGciOi...NEW...; Path=/auth; HttpOnly; SameSite=Strict
{
  "accessToken": "eyJhbGciOi...NEW_ACCESS_TOKEN..."
}
```

---

## Контрольні питання

1. Чому паролі користувачів категорично заборонено зберігати у базі даних у відкритому вигляді або за допомогою простих алгоритмів хешування типу MD5 чи SHA-256?
2. Що таке «сіль» (`salt`) у криптографічному хешуванні та від яких типів атак вона забезпечує захист?
3. З яких трьох базових складових складається JSON Web Token (JWT)? Яка інформація міститься у заголовку, корисному навантаженні та підписі?
4. У чому полягає відмінність між автентифікацією (`Authentication`) та авторизацією (`Authorization`)?
5. Яку роль відіграє `PassportStrategy` у NestJS та в який момент життєвого циклу запиту викликається її метод `validate()`?
6. Чому зберігання токенів доступу у `localStorage` браузера є небезпечним та які переваги надає прапорець `HttpOnly` у заголовку `Set-Cookie`?
7. Як влаштований механізм рольового контролю доступу (RBAC) за допомогою декоратора `@SetMetadata()` та класу `Reflector`?
8. У чому полягає призначення концепції подвійних токенів (Access Token + Refresh Token)? Чому час життя Access Token має бути коротким?
9. Як працює механізм ротації Refresh токенів та чому необхідно хешувати Refresh Token перед збереженням у базу даних?

---

## Критерії оцінювання

Оцінювання здійснюється за шкалою повноти реалізації рівнів практичної роботи:

- **«Задовільно» (Рівень 1):** реалізовано базовий прототип, створено структуру проєкту, програма успішно компілюється та виконує базові сценарії.
- **«Добре» (Рівень 2):** виконано базовий рівень та реалізовано ключову функціональність заняття, забезпечено надійність і безпеку виконання коду.
- **«Відмінно» (Рівень 3):** повністю завершено всі три рівні завдання з дотриманням кращих інженерних практик, чистоти архітектури та оптимізації.
- **Усний захист:** обов'язкове пояснення логіки коду та впевнені відповіді на контрольні питання викладача.

## Вимоги до звітності

1. Опублікувати вихідний код у Git-репозиторії.
2. Оформити файл `README.md` з описом проєкту, інструкцією запуску та обов'язковими скриншотами роботи програми (включаючи демонстрацію відсутності помилок).
3. Продемонструвати роботу програми викладачеві та захистити результати.
