-- Esquema de StoreGo (MySQL 5.7+ / 8.x o MariaDB 10.4+).
-- Es seguro ejecutarlo varias veces (usa IF NOT EXISTS).
-- Lo aplica `npm run db:init`; también puedes pegarlo a mano en MySQL Workbench o phpMyAdmin
-- después de crear y seleccionar la base de datos.

CREATE TABLE IF NOT EXISTS usuarios (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  run              VARCHAR(9)   NULL,
  nombre           VARCHAR(50)  NOT NULL,
  apellidos        VARCHAR(100) NOT NULL,
  email            VARCHAR(100) NOT NULL,
  password_hash    VARCHAR(100) NOT NULL,
  fecha_nacimiento DATE         NULL,
  telefono         VARCHAR(20)  NOT NULL DEFAULT '',
  region           VARCHAR(100) NOT NULL DEFAULT '',
  comuna           VARCHAR(100) NOT NULL DEFAULT '',
  direccion        VARCHAR(300) NOT NULL DEFAULT '',
  rol              ENUM('admin','vendedor','cliente') NOT NULL DEFAULT 'cliente',
  creado_en        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_run (run)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fotos subidas desde el panel de administración (se guardan dentro de MySQL).
CREATE TABLE IF NOT EXISTS imagenes (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  mime      VARCHAR(50)  NOT NULL,
  datos     MEDIUMBLOB   NOT NULL,
  creado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS productos (
  id             VARCHAR(80)  NOT NULL,
  seq            INT UNSIGNED NOT NULL AUTO_INCREMENT,   -- mantiene el orden de creación
  nombre         VARCHAR(60)  NOT NULL,
  descripcion    VARCHAR(200) NOT NULL,
  precio         INT UNSIGNED NOT NULL,
  img            TEXT         NOT NULL,                  -- /api/imagenes/ID, /img/archivo.jpg o una URL
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_productos_seq (seq)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Galería: fotos extra de cada producto (además de la imagen principal).
CREATE TABLE IF NOT EXISTS producto_imagenes (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  producto_id VARCHAR(80)      NOT NULL,
  url         TEXT             NOT NULL,
  orden       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_producto_imagenes (producto_id, orden),
  CONSTRAINT fk_galeria_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pedidos (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,   -- se muestra como P-0001
  usuario_id       INT UNSIGNED NULL,
  cliente_email    VARCHAR(100) NOT NULL,                  -- copia: el historial no cambia si se edita el usuario
  cliente_nombre   VARCHAR(160) NOT NULL,
  cliente_run      VARCHAR(9)   NULL,                      -- RUN del cliente al comprar (sin puntos ni guion)
  cliente_telefono VARCHAR(20)  NOT NULL DEFAULT '',
  total            INT UNSIGNED NOT NULL,
  estado           ENUM('pendiente','enviado','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
  creado_en        DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pedidos_usuario (usuario_id),
  KEY idx_pedidos_estado (estado),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Cada línea guarda una copia del nombre y precio: editar o borrar el producto no altera el pedido.
CREATE TABLE IF NOT EXISTS pedido_items (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id   INT UNSIGNED NOT NULL,
  producto_id VARCHAR(80)  NULL,
  nombre      VARCHAR(60)  NOT NULL,
  precio      INT UNSIGNED NOT NULL,
  cantidad    INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY idx_items_pedido (pedido_id),
  CONSTRAINT fk_items_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE,
  CONSTRAINT fk_items_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Línea de tiempo del seguimiento que ve el usuario.
CREATE TABLE IF NOT EXISTS pedido_historial (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  pedido_id INT UNSIGNED NOT NULL,
  estado    ENUM('pendiente','enviado','entregado','cancelado') NOT NULL,
  fecha     DATETIME(3)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_historial_pedido (pedido_id, fecha),
  CONSTRAINT fk_historial_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
