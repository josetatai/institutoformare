-- Biblioteca Formare: esquema do banco (MySQL 8 / MariaDB 10.6+)
-- Datas em UTC.

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  name VARCHAR(190) NULL,
  password_hash VARCHAR(100) NOT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(64) PRIMARY KEY,               -- sha256 do token do cookie
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash CHAR(64) PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catálogo -------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS collections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(190) NOT NULL,
  sort INT NOT NULL DEFAULT 0,
  is_new TINYINT(1) NOT NULL DEFAULT 0,
  -- cores da capa gerada quando o título não tem imagem
  color1 VARCHAR(9) NULL, color2 VARCHAR(9) NULL, color3 VARCHAR(9) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Produtos da Kiwify (o que se compra). Uma linha com oferta preenchida vale só para aquela oferta
-- (ex.: upsell que entrega mais coisas); a linha com oferta vazia vale para as demais.
CREATE TABLE IF NOT EXISTS products (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  kiwify_product_id VARCHAR(100) NOT NULL,
  kiwify_offer_id VARCHAR(100) NOT NULL DEFAULT '',  -- '' = qualquer oferta do produto
  name VARCHAR(255) NOT NULL,
  checkout_url VARCHAR(500) NULL,
  access_days INT NOT NULL DEFAULT 365,
  auto_release TINYINT(1) NOT NULL DEFAULT 0,          -- 1 = compras deste produto entram sozinhas na biblioteca (e o cliente recebe e-mail)
  kiwify_price_cents INT NULL,                         -- identifica a oferta pelo valor pago, quando a Kiwify não manda a oferta
  UNIQUE KEY uq_prod_offer (kiwify_product_id, kiwify_offer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Títulos da biblioteca (o que se lê)
CREATE TABLE IF NOT EXISTS titles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  collection_id INT UNSIGNED NOT NULL,
  vol_label VARCHAR(60) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  includes_json JSON NULL,               -- lista "o que vem no produto"
  toc_json JSON NULL,                    -- sumário
  cover_path VARCHAR(255) NULL,          -- caminho em /public, ex.: /capas/x.webp
  page_count INT NOT NULL DEFAULT 0,
  buy_product_id INT UNSIGNED NULL,      -- produto que o botão "Adquirir" abre
  sort INT NOT NULL DEFAULT 0,
  published TINYINT(1) NOT NULL DEFAULT 1,
  FOREIGN KEY (collection_id) REFERENCES collections(id),
  FOREIGN KEY (buy_product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Quais títulos cada produto libera e em quantos dias após a compra
CREATE TABLE IF NOT EXISTS product_titles (
  product_id INT UNSIGNED NOT NULL,
  title_id INT UNSIGNED NOT NULL,
  release_days INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, title_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attachments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title_id INT UNSIGNED NOT NULL,
  name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,       -- nome no disco, dentro de STORAGE_DIR/anexos/<slug>/
  mime VARCHAR(120) NOT NULL,
  size_bytes INT UNSIGNED NOT NULL DEFAULT 0,
  release_days INT NOT NULL DEFAULT 0,   -- dias após a compra
  sort INT NOT NULL DEFAULT 0,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Acesso ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS grants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  title_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NULL,
  order_id VARCHAR(100) NOT NULL,        -- pedido Kiwify, ou "manual-..." / "importacao-..."
  starts_at DATETIME NOT NULL,           -- data da compra aprovada
  release_at DATETIME NOT NULL,          -- liberação programada
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  revoke_reason VARCHAR(60) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_grant (user_id, title_id, order_id),
  INDEX (order_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reading_progress (
  user_id INT UNSIGNED NOT NULL,
  title_id INT UNSIGNED NOT NULL,
  page INT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, title_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS downloads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  attachment_id INT UNSIGNED NOT NULL,
  ip VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id), INDEX (attachment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Todo aviso da Kiwify fica guardado, processado ou não, para nenhuma venda se perder
CREATE TABLE IF NOT EXISTS webhook_events (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_kind VARCHAR(30) NULL,           -- approved | revoked | ignored
  event_raw_type VARCHAR(80) NULL,
  order_id VARCHAR(100) NULL,
  signature_ok TINYINT(1) NOT NULL DEFAULT 0,
  payload JSON NOT NULL,
  raw_body MEDIUMTEXT NULL,               -- corpo exatamente como chegou (para conferir a assinatura)
  sig_received VARCHAR(100) NULL,
  processed_at DATETIME NULL,
  error VARCHAR(500) NULL,
  INDEX (order_id), INDEX (processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Configurações editadas pelo painel (senha do e-mail, token do webhook etc.)
CREATE TABLE IF NOT EXISTS settings (
  k VARCHAR(60) PRIMARY KEY,
  v TEXT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
