# 🍗 Sistema de Inventario Boneless

> **Herramienta local de gestión de inventario, recetas, ventas y cálculo de costos y márgenes para negocios de boneless y comida rápida.**

Este sistema ha sido diseñado como una solución **local-first** rápida, intuitiva y visualmente atractiva para dueños de negocios gastronómicos (especialmente de alitas y boneless). Permite llevar el control milimétrico de los insumos, costear platillos en tiempo real y registrar las ventas diarias calculando la utilidad neta exacta basada en el historial de compras.

---

## 🚀 Características Clave

### 📊 1. Dashboard en Tiempo Real (Panel Principal)
*   **Métricas Clave (KPIs):** Visualización instantánea del valor total del inventario en dinero, ventas del día, costos operativos acumulados y ganancias netas del día.
*   **Alertas de Abastecimiento:** Notificaciones visuales llamativas cuando los ingredientes clave caen por debajo de su stock mínimo configurado.
*   **Gráficos Interactivos:** Historial de ventas diarias y desglose de platillos más vendidos.

### 🥫 2. Gestión de Insumos con Lógica FIFO (PEPS)
*   **Control por Lotes:** Cada compra de insumos se registra como un lote independiente con su fecha, cantidad inicial, precio de compra y costo unitario.
*   **Método FIFO (First-In, First-Out):** Las ventas descuentan automáticamente los ingredientes del lote más antiguo disponible. Esto garantiza que el cálculo del costo de venta y las utilidades refleje con total precisión los precios históricos reales de compra.
*   **Unidades Estandarizadas:** Soporte para gramos (`g`), mililitros (`ml`), piezas (`piezas`) y unidades (`unidades`).

### 🍳 3. Escandallo y Costeo de Platillos (Recetas)
*   **Fórmulas Dinámicas:** Crea combos o platillos individuales seleccionando insumos del catálogo y definiendo las porciones exactas (ej. 200g de pollo, 30ml de salsa, 1 charola).
*   **Cálculo Automático de Costo:** Suma el costo exacto de producción según el costo unitario vigente de los insumos en inventario.
*   **Análisis de Márgenes:** Te indica el margen de ganancia porcentual y en dinero según el precio de venta sugerido, ayudándote a fijar precios de manera inteligente.

### 🛒 4. Punto de Venta y Registro de Ventas
*   **Registro Rápido:** Agrega ventas de platillos especificando la cantidad con un par de clics.
*   **Deducción Automática:** Al confirmar una venta, el inventario se actualiza de inmediato descontando las materias primas necesarias a través de FIFO.
*   **Historial Detallado:** Registro completo de transacciones con marca de tiempo, costo de insumos, precio cobrado y utilidad generada.

### 💾 5. Respaldo y Portabilidad de Datos
*   **Exportación en JSON:** Descarga un respaldo de toda tu base de datos (catálogo, inventario actual, compras y ventas) en un solo archivo con un clic.
*   **Importación en JSON:** Restaura tus datos o transfiérelos a otro navegador o dispositivo de forma instantánea.
*   **Restablecimiento Semilla:** Opción para borrar todo el almacenamiento local y cargar datos de prueba preconfigurados para explorar la aplicación.

---

## 🛠️ Stack Tecnológico

El proyecto está construido con un stack moderno y eficiente enfocado en velocidad y animaciones fluidas:

*   **Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Herramienta de Construcción:** [Vite 6](https://vite.dev/)
*   **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/) (diseño premium, responsivo y adaptado para modo oscuro)
*   **Animaciones:** [Framer Motion / Motion React](https://motion.dev/) (micro-interacciones y transiciones suaves)
*   **Iconografía:** [Lucide React](https://lucide.dev/)
*   **Persistencia:** LocalStorage API (Almacenamiento directo en el navegador del usuario para privacidad y velocidad total offline)

---

## 📦 Instalación y Ejecución Local

### Requisitos Previos
*   Tener instalado [Node.js](https://nodejs.org/) (Versión 18 o superior recomendada).

### Pasos para iniciar el entorno de desarrollo

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar variables de entorno (Opcional):**
    Puedes copiar el archivo `.env.example` y renombrarlo como `.env.local` si deseas configurar variables adicionales para despliegues.
    ```bash
    cp .env.example .env.local
    ```

3.  **Iniciar servidor de desarrollo:**
    ```bash
    npm run dev
    ```

4.  **Abrir el navegador:**
    Ve a [http://localhost:3000](http://localhost:3000) (o el puerto que te indique la consola) para interactuar con la aplicación.

---

## 📊 Entendiendo la Lógica FIFO (PEPS) del Sistema

El sistema implementa el algoritmo **FIFO (First-In, First-Out)** para asegurar la salud financiera del negocio:

1.  **Compra A:** Se compran $5\text{ kg}$ de pollo a **$60/kg** (Costo unitario: **$0.06/g**).
2.  **Compra B:** A los 3 días, debido a la inflación, se compran otros $5\text{ kg}$ de pollo a **$70/kg** (Costo unitario: **$0.07/g**).
3.  **Venta:** Se vende un combo que requiere $300\text{ g}$ de pollo. El sistema descontará esos $300\text{ g}$ del lote de la **Compra A** (valuando el pollo a **$0.06/g**).
4.  **Transición:** Una vez que los primeros $5\text{ kg}$ se agotan por completo, el sistema empieza a descontar del lote de la **Compra B**, actualizando dinámicamente el costo del platillo a **$0.07/g**. Esto te permite saber con precisión exacta cuánto estás ganando en cada momento.

---

## 📂 Estructura del Proyecto

```text
├── src/
│   ├── components/       # Componentes y paneles de la interfaz de usuario
│   │   ├── DashboardHome.tsx   # Panel de métricas e inicio
│   │   ├── InsumosPanel.tsx    # Gestión del stock y compras por lotes
│   │   ├── PlatillosPanel.tsx  # Definición de recetas y precios de venta
│   │   ├── VentasPanel.tsx     # Punto de venta y registro
│   │   └── ReportesPanel.tsx   # Historiales y utilidades de importación/exportación
│   ├── utils/
│   │   └── storage.ts          # Controladores y carga de datos semilla en LocalStorage
│   ├── types.ts          # Tipos e interfaces de datos de TypeScript
│   ├── App.tsx           # Entrada y enrutador principal de la app
│   ├── main.tsx          # Inicialización de React
│   └── index.css         # Estilos globales y Tailwind CSS
├── index.html            # Plantilla HTML base
├── package.json          # Archivo de configuración de npm
└── vite.config.ts        # Configuración del bundler Vite
```
