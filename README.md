"# Lashes Store Backend 🚀

Backend API para el sistema de gestión de tienda de pestañas desarrollado con Node.js, Express, TypeScript y MongoDB.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [API Endpoints](#api-endpoints)
- [Modelos de Datos](#modelos-de-datos)
- [Autenticación](#autenticación)
- [Scripts Disponibles](#scripts-disponibles)
- [Despliegue](#despliegue)
- [Variables de Entorno](#variables-de-entorno)

## ✨ Características

- 🔐 **Autenticación JWT** con refresh tokens
- 👥 **Gestión de usuarios** y roles
- 🛍️ **Catálogo de productos** con variantes
- 📦 **Control de inventario** y stock
- 🛒 **Sistema de pedidos** completo
- 👤 **Gestión de clientes**
- 🏷️ **Categorización** de productos
- 📸 **Gestión de imágenes** con ImageKit
- 📊 **API REST** completa
- 🌐 **CORS** configurado
- 🚀 **Desplegable en Vercel**

## 🛠️ Tecnologías

### Backend
- **Node.js** - Runtime de JavaScript
- **Express.js** - Framework web
- **TypeScript** - Tipado estático
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB

### Autenticación y Seguridad
- **JWT** - JSON Web Tokens
- **bcryptjs** - Hashing de contraseñas
- **CORS** - Cross-Origin Resource Sharing

### Utilidades
- **Morgan** - HTTP request logger
- **Multer** - Manejo de archivos
- **ImageKit** - Gestión de imágenes
- **Axios** - Cliente HTTP
- **dotenv** - Variables de entorno

### Desarrollo
- **TSX** - TypeScript execution
- **Nodemon** - Hot reload
- **Vercel** - Platform de despliegue

## 📦 Instalación

### Prerrequisitos
- Node.js 18+
- pnpm (recomendado) o npm
- MongoDB (local o Atlas)

### Pasos de instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd lashes-store-backend
```

2. **Instalar dependencias**
```bash
pnpm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus valores
```

4. **Ejecutar en desarrollo**
```bash
pnpm dev
```

## ⚙️ Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Servidor
PORT=5000
NODE_ENV=development

# Base de datos
DB_URI=mongodb+srv://user:password@cluster.mongodb.net/database

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_REFRESH_SECRET=tu_refresh_secret_muy_seguro

# ImageKit (opcional)
IMAGEKIT_PUBLIC_KEY=public_key
IMAGEKIT_PRIVATE_KEY=private_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

# AWS (para servicio de email)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
EMAIL_SERVICE_URL=https://api-email-sending.vercel.app/send-email
```

## 📁 Estructura del Proyecto

```
lashes-store-backend/
├── src/
│   ├── api/                    # Vercel serverless handler
│   │   └── index.ts
│   ├── config/                 # Configuraciones
│   │   ├── db.ts              # Conexión MongoDB
│   │   └── imagekit.config.ts # Configuración ImageKit
│   ├── errors/                 # Manejo de errores
│   │   └── CustomErrors.ts
│   ├── libs/                   # Librerías compartidas
│   │   ├── asyncHandler.ts    # Wrapper async
│   │   ├── httpError.ts       # Errores HTTP
│   │   └── jwt.ts             # Utilidades JWT
│   ├── middlewares/           # Middlewares
│   │   ├── auth.ts            # Autenticación
│   │   └── uploadMiddleware.ts # Subida archivos
│   ├── modules/               # Módulos principales
│   │   ├── users/             # Gestión usuarios
│   │   ├── products/          # Gestión productos
│   │   ├── orders/            # Gestión pedidos
│   │   ├── customers/         # Gestión clientes
│   │   ├── categories/        # Gestión categorías
│   │   ├── images/            # Gestión imágenes
│   │   └── roles/             # Gestión roles
│   ├── routes/                # Definición de rutas
│   ├── types/                 # Tipos TypeScript
│   ├── utils/                 # Utilidades
│   ├── app.ts                 # Configuración Express
│   └── server.ts              # Punto de entrada
├── types/                     # Tipos globales
├── package.json
├── tsconfig.json
├── vercel.json               # Configuración Vercel
└── README.md
```

## 🌐 API Endpoints

### Autenticación
```
POST   /api/auth/login           # Iniciar sesión
POST   /api/auth/register        # Registrar usuario
POST   /api/auth/refresh         # Renovar token
POST   /api/auth/logout          # Cerrar sesión
```

### Productos
```
GET    /api/product              # Listar productos
GET    /api/product/:id          # Obtener producto
POST   /api/product              # Crear producto
PUT    /api/product/:id          # Actualizar producto
DELETE /api/product/:id          # Eliminar producto
GET    /api/product/low-stock    # Productos con stock bajo
```

### Categorías
```
GET    /api/categories           # Listar categorías
GET    /api/categories/:id       # Obtener categoría
POST   /api/categories           # Crear categoría
PUT    /api/categories/:id       # Actualizar categoría
DELETE /api/categories/:id       # Eliminar categoría
```

### Pedidos
```
GET    /api/orders               # Listar pedidos
GET    /api/orders/:id           # Obtener pedido
POST   /api/orders               # Crear pedido
PUT    /api/orders/:id           # Actualizar pedido
DELETE /api/orders/:id           # Eliminar pedido
GET    /api/orders/today         # Ventas del día
```

### Clientes
```
GET    /api/customers            # Listar clientes
GET    /api/customers/:id        # Obtener cliente
POST   /api/customers            # Crear cliente
PUT    /api/customers/:id        # Actualizar cliente
DELETE /api/customers/:id        # Eliminar cliente
```

### Imágenes
```
POST   /api/images/upload        # Subir imagen
DELETE /api/images/:id           # Eliminar imagen
```

## 💾 Modelos de Datos

### Usuario (User)
```typescript
{
  email: string;
  nickname?: string;
  passwordHash: string;
  role: ObjectId; // Referencia a Role
  createdAt: Date;
  updatedAt: Date;
}
```

### Producto (Product)
```typescript
{
  name: string;
  namePublic?: string;
  description?: string;
  category?: ObjectId;
  sku?: string;
  stock: number;
  minStock: number;
  basePrice: number;
  salePrice: number;
  wholesalePrice?: number;
  images: string[];
  references?: Array<{
    name: string;
    options: Array<{
      label: string;
      value: string;
      stocks?: number;
    }>;
  }>;
  isActiveInCatalog: boolean;
  isActive: boolean;
  rating: number;
}
```

### Pedido (Order)
```typescript
{
  orderNumber: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: object;
  };
  items: Array<{
    product: ObjectId;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    selectedVariant?: object;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  paymentMethod: 'cash' | 'card' | 'transfer';
  paymentStatus: 'pending' | 'paid' | 'partial';
}
```

### Cliente (Customer)
```typescript
{
  name: string;
  email?: string;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  isActive: boolean;
  totalOrders: number;
  totalSpent: number;
}
```

### Categoría (Category)
```typescript
{
  name: string;
  description?: string;
  image?: string;
  isActive: boolean;
  parentCategory?: ObjectId;
  order: number;
}
```

## 🔐 Autenticación

El sistema utiliza JWT con refresh tokens:

1. **Login**: Retorna access token (15min) y refresh token (7 días)
2. **Acceso**: Access token en header `Authorization: Bearer <token>`
3. **Renovación**: Endpoint `/auth/refresh` con refresh token
4. **Roles**: Control de acceso basado en roles de usuario

### Middleware de Autenticación

```typescript
// Ruta protegida
app.use('/api/admin', authMiddleware, adminRoutes);

// Verificación en controlador
if (req.user.role !== 'admin') {
  throw new UnauthorizedError('Acceso denegado');
}
```

## 📜 Scripts Disponibles

```bash
# Desarrollo
pnpm dev          # Ejecutar en modo desarrollo con hot reload

# Construcción
pnpm build        # Compilar TypeScript a JavaScript

# Producción
pnpm start        # Ejecutar versión compilada

# Utilidades
pnpm lint         # Verificar código (si está configurado)
pnpm test         # Ejecutar tests (si están configurados)
```

## 🚀 Despliegue

### Vercel (Recomendado)

1. **Instalar Vercel CLI**
```bash
npm i -g vercel
```

2. **Configurar proyecto**
```bash
vercel
```

3. **Variables de entorno**
- Configurar todas las variables de entorno en el dashboard de Vercel

4. **Deploy**
```bash
vercel --prod
```

### Otros proveedores

El proyecto es compatible con:
- **Heroku**: Añadir `Procfile`
- **Railway**: Deploy directo desde Git
- **DigitalOcean App Platform**: Configurar buildpack Node.js
- **AWS EC2**: Con PM2 para gestión de procesos

## 🌍 Variables de Entorno

### Requeridas
- `DB_URI`: URL de conexión MongoDB
- `JWT_SECRET`: Secreto para firmar tokens JWT
- `JWT_REFRESH_SECRET`: Secreto para refresh tokens

### Opcionales
- `PORT`: Puerto del servidor (default: 5000)
- `NODE_ENV`: Entorno de ejecución
- `IMAGEKIT_*`: Configuración ImageKit para imágenes
- `AWS_*`: Credenciales AWS para servicios externos
- `EMAIL_SERVICE_URL`: URL del servicio de email

## 🔧 Configuración de Desarrollo

### MongoDB Local
```bash
# Instalar MongoDB
brew install mongodb-community # macOS
# o seguir guía oficial para tu OS

# Ejecutar MongoDB
brew services start mongodb-community
```

### Conexión MongoDB Atlas
```env
DB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

## 📈 Características Avanzadas

### Gestión de Stock
- Control automático de inventario
- Alertas de stock bajo
- Variantes de productos con stock individual
- Actualización automática en ventas

### Sistema de Pedidos
- Números de pedido únicos generados automáticamente
- Estados de pedido trackeable
- Cálculo automático de totales
- Soporte para diferentes métodos de pago

### Imágenes
- Integración con ImageKit para optimización
- Subida múltiple de archivos
- Compresión automática
- CDN global

### Roles y Permisos
- Sistema de roles flexible
- Control de acceso granular
- Middleware de autorización

## 🐛 Solución de Problemas

### Error de Conexión a MongoDB
```bash
# Verificar URL de conexión
echo $DB_URI

# Verificar conectividad
mongosh "mongodb+srv://..."
```

### Error de JWT
```bash
# Verificar secretos JWT
echo $JWT_SECRET
echo $JWT_REFRESH_SECRET
```

### Puerto en uso
```bash
# Cambiar puerto en .env
PORT=3001

# O encontrar proceso usando puerto
lsof -ti:5000 | xargs kill -9
```

## 📚 Recursos Adicionales

- [Express.js Documentation](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/)
- [JWT.io](https://jwt.io/)
- [Vercel Documentation](https://vercel.com/docs)

---

**Desarrollado con ❤️ para Lashes Store**

Para soporte o preguntas, contacta al equipo de desarrollo." 
