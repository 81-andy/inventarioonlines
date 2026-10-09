# 📦 Sistema de Inventario a Tiempo Real

Aplicación web fullstack para la gestión de inventarios multi-producto con tres roles diferenciados (Administrador, Operador y Supervisor), control de entradas/salidas con lógica FIFO por vencimiento, generación automática de alertas y reportes con gráficos interactivos.

## 🚀 Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript |
| Estilos | Tailwind CSS 4 + shadcn/ui (New York) |
| Base de datos | Prisma ORM + SQLite |
| Autenticación | JWT (jose) + bcryptjs (RBAC) |
| Gráficos | Recharts |
| Estado | Zustand |
| Notificaciones | sonner |

## 👥 Roles de Usuario

### 🔴 Administrador
- Gestión de usuarios (alta/baja/cambio de rol)
- CRUD de categorías de productos
- Configuración de parámetros globales (umbrales de alerta)

### 🟢 Operador
- Alta de productos (código único e inmutable)
- Registro de lotes con fecha de vencimiento
- Registro de entradas (suma stock)
- Registro de salidas (resta stock con lógica FIFO)
- Consulta de stock actual por producto y lote

### 🟡 Supervisor (solo lectura)
- KPIs: total productos, stock total, alertas activas, productos bajo stock
- Gráfico de barras: existencias por producto
- Gráfico de líneas: entradas vs. salidas en el tiempo
- Gráfico de torta: distribución por categoría
- Tabla de próximos vencimientos con estados
- Filtros por rango de fechas

## 🔑 Credenciales de Demostración

La aplicación auto-siembra estos usuarios en el primer login:

| Rol | Email | Contraseña |
|---|---|---|
| Admin | `admin@inventario.com` | `admin123` |
| Operador | `operador@inventario.com` | `operador123` |
| Supervisor | `supervisor@inventario.com` | `supervisor123` |

También se siembran 9 productos demo, 5 categorías y parámetros iniciales.

## 📋 Reglas de Negocio Implementadas

- ✅ No se permiten salidas mayores al stock disponible
- ✅ El código de producto es único e inmutable
- ✅ Un lote no puede tener fecha de vencimiento anterior a su fecha de ingreso
- ✅ Las salidas consumen primero el lote más próximo a vencer (**FIFO**)
- ✅ Las alertas se recalculan automáticamente tras cada movimiento
- ✅ Solo el administrador puede modificar los umbrales de alerta

## 🗂️ Modelo de Datos

```
Usuario(id, email, name, passwordHash, role, active)
Categoria(id, nombre)
Producto(id, codigo, nombre, descripcion, categoriaId, unidadMedida, stockMinimo, stockActual)
Lote(id, productoId, numeroLote, cantidadInicial, cantidadActual, fechaIngreso, fechaVencimiento)
Movimiento(id, loteId, productoId, tipo[entrada/salida], cantidad, motivo, fecha, usuarioId)
Alerta(id, tipo[stock_bajo/vencimiento], productoId, loteId, estado, fechaGeneracion, fechaResolucion)
Parametro(id, clave, valor)
```

## 🛠️ Instalación Local

```bash
# 1. Instalar dependencias
bun install

# 2. Configurar variables de entorno
cp .env.example .env  # si existe, o crear con:
# DATABASE_URL=file:/home/z/my-project/db/custom.db
# JWT_SECRET=tu-clave-secreta-aqui

# 3. Inicializar la base de datos
bun run db:push

# 4. Iniciar el servidor de desarrollo
bun run dev
```

La app estará disponible en `http://localhost:3000`.

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/                    # API Routes (Next.js Route Handlers)
│   │   ├── auth/               # login, logout, me
│   │   ├── productos/          # CRUD productos
│   │   ├── lotes/              # CRUD lotes
│   │   ├── movimientos/        # Entradas/salidas con FIFO
│   │   ├── alertas/            # Listado y atención de alertas
│   │   ├── usuarios/           # CRUD usuarios (admin)
│   │   ├── categorias/         # CRUD categorías
│   │   ├── parametros/         # Configuración (admin)
│   │   ├── reportes/           # Datos agregados para gráficos
│   │   └── seed/               # Siembra de datos demo
│   ├── layout.tsx
│   └── page.tsx                # SPA con cambio de vistas por rol
├── components/
│   ├── AppShell.tsx            # Layout con sidebar por rol
│   ├── views/
│   │   ├── LoginView.tsx
│   │   ├── OperadorView.tsx
│   │   ├── SupervisorView.tsx
│   │   └── AdminView.tsx
│   └── ui/                     # Componentes shadcn/ui
└── lib/
    ├── auth.ts                 # JWT + bcrypt helpers
    ├── auth-middleware.ts      # requireAuth / requireRole
    ├── alertas.ts              # Recálculo de alertas
    ├── db.ts                   # Prisma client
    ├── store.ts                # Zustand store
    └── use-fetch.ts            # Hook de fetch

prisma/
└── schema.prisma               # Esquema de la base de datos
```

## 🧪 Verificación End-to-End

La aplicación fue verificada con Agent Browser:
- ✅ Login con los 3 roles
- ✅ Salida con FIFO (stock bajó de 30 → 23 unidades)
- ✅ Alertas generadas automáticamente (stock bajo + vencimientos próximos)
- ✅ Cambio de parámetros de alerta funcionando
- ✅ Gráficos del supervisor renderizando datos reales

## 📝 Scripts Disponibles

```bash
bun run dev        # Servidor de desarrollo (puerto 3000)
bun run build      # Build de producción
bun run start      # Servidor de producción
bun run lint       # ESLint
bun run db:push    # Sincronizar esquema Prisma con SQLite
bun run db:generate # Regenerar Prisma Client
```

## 🚧 Próximas Mejoras Sugeridas

- Exportación de reportes a PDF/Excel
- Notificaciones en tiempo real con WebSocket
- Bitácora de auditoría para admin
- Validación de stock mínimo razonable en alta de producto

## 📄 Licencia

MIT
