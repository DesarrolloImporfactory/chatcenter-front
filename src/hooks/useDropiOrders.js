import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MOCK: Se activa cuando Dropi no responde en localhost por bloqueo de IP
const USE_MOCK =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOCK_ORDERS = [
  {
    id: 4840768,
    dir: "direccionprueba referprueba -",
    city: "QUITO",
    name: "nodespacharsebas",
    surname: "-",
    phone: "962803007",
    state: "PICHINCHA",
    status: "CANCELADO",
    rate_type: "CON RECAUDO",
    shipping_amount: 4.83,
    shipping_company: "VELOCES",
    total_order: 29.99,
    notes: "COOLER PARA LAPTOP PB SOPORTE LAPTOP: NEGRO ***",
    created_at: "2026-03-18T15:31:48",
    updated_at: "2026-03-20T15:24:37",
    type: "FINAL_ORDER",
    tray: "ia_ventas",
    agent_assigned: "Imporfactory Admin",
    chat_id_cliente: 293150,
    chat_id_encargado: 274,
    shop: {
      id: 40105,
      name: "Imporshop 2",
      type: "SHOPIFY",
      user_id: 94375,
      key_base_data: 40105,
    },
    shop_id: 40105,
    shop_order_id: "6936516231417",
    shop_order_number: 1064,
    distribution_company: {
      id: 3,
      name: "VELOCES",
      color: null,
      is_veloces: false,
      key_base_data: 3,
    },
    distribution_company_id: 3,
    warehouse: {
      id: 301,
      name: "IMPORSHOP BILOXI",
      key_base_data: 301,
      city: {
        id: 802,
        name: "QUITO",
        department: { id: 43, name: "PICHINCHA", key_base_data: 43 },
        department_id: 43,
        key_base_data: 802,
      },
      city_id: 802,
    },
    warehouse_id: 301,
    supplier: {
      id: 9440,
      status: "Activo",
      role_id: 3,
      created_by: null,
      key_base_data: 9440,
    },
    supplier_id: 9440,
    user: {
      id: 94375,
      status: "Activo",
      role_id: 2,
      role_user: { id: 2, name: "DROPSHIPPER", key_base_data: 2 },
      key_base_data: 94375,
      white_brand_id: 1,
    },
    user_id: 94375,
    orderdetails: [
      {
        key_base_data: 4840768,
        product_id: 123171,
        quantity: 1,
        product: {
          id: 123171,
          sku: "IM-COOLER",
          name: "COOLER PARA LAPTOP PB SOPORTE LAPTOP",
          type: "VARIABLE",
          active: true,
          sale_price: 14,
          suggested_price: 25,
          user_id: 9440,
          gallery: [
            {
              urlS3: "ecuador/products/123171/1773073139jasjdashakda.PNG",
              key_base_data: 123171,
            },
          ],
          warehouse_product: [],
          warehouses: [],
        },
        variation: {
          id: 44305,
          sku: "IM-COOLER-0",
          key_base_data: 44305,
          attribute_values: [
            {
              value: "NEGRO",
              attribute: { description: "COLOR", key_base_data: 15741 },
              attribute_id: 15741,
              key_base_data: 38050,
            },
          ],
        },
        variation_id: 44305,
      },
    ],
    tags: [],
    shipping_guide: null,
    guia_urls3: null,
    guide_was_downloaded: false,
    sticker: null,
    warranty: false,
    warranty_type: null,
    colonia: null,
    coordinates: null,
    zip_code: null,
    indemnized: false,
    invoiced: false,
    invoice_id: null,
    servientrega_movements: [],
    novedad_servientrega: null,
  },
  {
    id: 4839727,
    dir: "no despachar pedido de prueba no despachar pedido de prueba -",
    city: "QUITO",
    name: "pedido",
    surname: "de prueba",
    phone: "962803007",
    state: "PICHINCHA",
    status: "CANCELADO",
    rate_type: "CON RECAUDO",
    shipping_amount: 4.71,
    shipping_company: "VELOCES",
    total_order: 24.99,
    notes: "- - Camiseta disimuladora: S NEGRA ***",
    created_at: "2026-03-18T13:41:54",
    updated_at: "2026-03-18T15:20:45",
    type: "FINAL_ORDER",
    tray: "ia_ventas",
    agent_assigned: "Imporfactory Admin",
    chat_id_cliente: 293150,
    chat_id_encargado: 274,
    shop: {
      id: 40105,
      name: "Imporshop 2",
      type: "SHOPIFY",
      user_id: 94375,
      key_base_data: 40105,
    },
    shop_id: 40105,
    shop_order_id: "6936370675961",
    shop_order_number: 1061,
    distribution_company: {
      id: 3,
      name: "VELOCES",
      color: null,
      is_veloces: false,
      key_base_data: 3,
    },
    distribution_company_id: 3,
    warehouse: {
      id: 301,
      name: "IMPORSHOP BILOXI",
      key_base_data: 301,
      city: {
        id: 802,
        name: "QUITO",
        department: { id: 43, name: "PICHINCHA", key_base_data: 43 },
        department_id: 43,
        key_base_data: 802,
      },
      city_id: 802,
    },
    warehouse_id: 301,
    supplier: {
      id: 9440,
      status: "Activo",
      role_id: 3,
      created_by: null,
      key_base_data: 9440,
    },
    supplier_id: 9440,
    user: {
      id: 94375,
      status: "Activo",
      role_id: 2,
      role_user: { id: 2, name: "DROPSHIPPER", key_base_data: 2 },
      key_base_data: 94375,
      white_brand_id: 1,
    },
    user_id: 94375,
    orderdetails: [
      {
        key_base_data: 4839727,
        product_id: 132831,
        quantity: 1,
        product: {
          id: 132831,
          sku: "IM-CAMIDISI",
          name: "Camiseta disimuladora",
          type: "VARIABLE",
          active: true,
          sale_price: null,
          suggested_price: null,
          user_id: 9440,
          gallery: [
            {
              urlS3: "ecuador/products/132831/1772823743asdasdqadasd.PNG",
              key_base_data: 132831,
            },
          ],
          warehouse_product: [],
          warehouses: [],
        },
        variation: {
          id: 44485,
          sku: "-0",
          key_base_data: 44485,
          attribute_values: [
            {
              value: "S NEGRA",
              attribute: { description: "TALLACOLOR", key_base_data: 15912 },
              attribute_id: 15912,
              key_base_data: 38207,
            },
          ],
        },
        variation_id: 44485,
      },
    ],
    tags: [],
    shipping_guide: null,
    guia_urls3: null,
    guide_was_downloaded: false,
    sticker: null,
    warranty: false,
    warranty_type: null,
    colonia: null,
    coordinates: null,
    zip_code: null,
    indemnized: false,
    invoiced: false,
    invoice_id: null,
    servientrega_movements: [],
    novedad_servientrega: null,
  },
  {
    id: 4602379,
    dir: "nodespachar nodespachar -",
    city: "QUITO",
    name: "nombreactulizado",
    surname: "-ape",
    phone: "962803007",
    state: "PICHINCHA",
    status: "PENDIENTE CONFIRMACION",
    rate_type: "CON RECAUDO",
    shipping_amount: 4.88,
    shipping_company: "VELOCES",
    total_order: 31.98,
    notes: null,
    created_at: "2026-02-23T18:44:30",
    updated_at: "2026-03-21T17:16:47",
    type: "FINAL_ORDER",
    tray: "ia_ventas",
    agent_assigned: "Imporfactory Admin",
    chat_id_cliente: 293150,
    chat_id_encargado: 274,
    shop: {
      id: 32204,
      name: "ImporshopTiendaa",
      type: "SHOPIFY",
      user_id: 94375,
      key_base_data: 32204,
    },
    shop_id: 32204,
    shop_order_id: "7172437016757",
    shop_order_number: 1273,
    distribution_company: {
      id: 3,
      name: "VELOCES",
      color: null,
      is_veloces: false,
      key_base_data: 3,
    },
    distribution_company_id: 3,
    warehouse: {
      id: 301,
      name: "IMPORSHOP BILOXI",
      key_base_data: 301,
      city: {
        id: 802,
        name: "QUITO",
        department: { id: 43, name: "PICHINCHA", key_base_data: 43 },
        department_id: 43,
        key_base_data: 802,
      },
      city_id: 802,
    },
    warehouse_id: 301,
    supplier: {
      id: 9440,
      status: "Activo",
      role_id: 3,
      created_by: null,
      key_base_data: 9440,
    },
    supplier_id: 9440,
    user: {
      id: 94375,
      status: "Activo",
      role_id: 2,
      role_user: { id: 2, name: "DROPSHIPPER", key_base_data: 2 },
      key_base_data: 94375,
      white_brand_id: 1,
    },
    user_id: 94375,
    orderdetails: [
      {
        key_base_data: 4602379,
        product_id: 87396,
        quantity: 1,
        product: {
          id: 87396,
          sku: "IMP-091-ROSMAN",
          name: "ROSA MANZANA IMPORT",
          type: "SIMPLE",
          active: true,
          sale_price: 15,
          suggested_price: 30,
          user_id: 9440,
          gallery: [
            {
              urlS3:
                "ecuador/products/87396/174404085561aagss5MUL._AC_UY1000_.jpg",
              key_base_data: 87396,
            },
          ],
          warehouse_product: [
            {
              warehouse: [
                {
                  name: "IMPORSHOP BILOXI",
                  city_id: 802,
                  user_id: 9440,
                  key_base_data: 301,
                },
              ],
              key_base_data: 87396,
              warehouse_id: 301,
            },
          ],
          warehouses: [],
        },
        variation: null,
        variation_id: null,
      },
    ],
    tags: [],
    shipping_guide: null,
    guia_urls3: null,
    guide_was_downloaded: false,
    sticker: null,
    warranty: false,
    warranty_type: null,
    colonia: null,
    coordinates: null,
    zip_code: null,
    indemnized: false,
    invoiced: false,
    invoice_id: null,
    servientrega_movements: [],
    novedad_servientrega: null,
  },
  {
    id: 3935560,
    dir: "calle1 lugar -",
    city: "QUITO",
    name: "nodespahcar",
    surname: "-",
    phone: "962803007",
    state: "PICHINCHA",
    status: "CANCELADO",
    rate_type: "CON RECAUDO",
    shipping_amount: 4.99,
    shipping_company: "VELOCES",
    total_order: 36.98,
    notes: null,
    created_at: "2025-12-24T11:30:24",
    updated_at: "2025-12-26T17:19:31",
    type: "FINAL_ORDER",
    tray: "ia_ventas",
    agent_assigned: "Imporfactory Admin",
    chat_id_cliente: 293150,
    chat_id_encargado: 274,
    shop: {
      id: 32204,
      name: "ImporshopTiendaa",
      type: "SHOPIFY",
      user_id: 94375,
      key_base_data: 32204,
    },
    shop_id: 32204,
    shop_order_id: "7043546022069",
    shop_order_number: 1179,
    distribution_company: {
      id: 3,
      name: "VELOCES",
      color: null,
      is_veloces: false,
      key_base_data: 3,
    },
    distribution_company_id: 3,
    warehouse: {
      id: 301,
      name: "IMPORSHOP BILOXI",
      key_base_data: 301,
      city: {
        id: 802,
        name: "QUITO",
        department: { id: 43, name: "PICHINCHA", key_base_data: 43 },
        department_id: 43,
        key_base_data: 802,
      },
      city_id: 802,
    },
    warehouse_id: 301,
    supplier: {
      id: 9440,
      status: "Activo",
      role_id: 3,
      created_by: null,
      key_base_data: 9440,
    },
    supplier_id: 9440,
    user: {
      id: 94375,
      status: "Activo",
      role_id: 2,
      role_user: { id: 2, name: "DROPSHIPPER", key_base_data: 2 },
      key_base_data: 94375,
      white_brand_id: 1,
    },
    user_id: 94375,
    orderdetails: [
      {
        key_base_data: 3935560,
        product_id: 120897,
        quantity: 1,
        product: {
          id: 120897,
          sku: "FREID-PRO-1",
          name: "FREIDORA PRO CANASTA",
          type: "SIMPLE",
          active: true,
          sale_price: 5.5,
          suggested_price: 10,
          user_id: 9440,
          gallery: [
            {
              urlS3:
                "ecuador/products/120897/1765258175Captura de pantalla 2025-12-09 a la(s) 12.23.30 a. m..png",
              key_base_data: 120897,
            },
          ],
          warehouse_product: [
            {
              warehouse: [
                {
                  name: "IMPORSHOP BILOXI",
                  city_id: 802,
                  user_id: 9440,
                  key_base_data: 301,
                },
              ],
              key_base_data: 120897,
              warehouse_id: 301,
            },
          ],
          warehouses: [],
        },
        variation: null,
        variation_id: null,
      },
    ],
    tags: [],
    shipping_guide: null,
    guia_urls3: null,
    guide_was_downloaded: false,
    sticker: null,
    warranty: false,
    warranty_type: null,
    colonia: null,
    coordinates: null,
    zip_code: null,
    indemnized: false,
    invoiced: false,
    invoice_id: null,
    servientrega_movements: [],
    novedad_servientrega: null,
  },
  {
    id: 3652437,
    dir: "direccion1 referna -",
    city: "QUITO",
    name: "Michael",
    surname: "Pruebanodespachar",
    phone: "962803007",
    state: "PICHINCHA",
    status: "CANCELADO",
    rate_type: "CON RECAUDO",
    shipping_amount: 5.17,
    shipping_company: "VELOCES",
    total_order: 44.99,
    notes: null,
    created_at: "2025-11-28T21:26:24",
    updated_at: "2025-12-01T15:41:52",
    type: "FINAL_ORDER",
    tray: "ia_ventas",
    agent_assigned: "Imporfactory Admin",
    chat_id_cliente: 293150,
    chat_id_encargado: 274,
    shop: {
      id: 32204,
      name: "ImporshopTiendaa",
      type: "SHOPIFY",
      user_id: 94375,
      key_base_data: 32204,
    },
    shop_id: 32204,
    shop_order_id: "6977829798069",
    shop_order_number: 1138,
    distribution_company: {
      id: 3,
      name: "VELOCES",
      color: null,
      is_veloces: false,
      key_base_data: 3,
    },
    distribution_company_id: 3,
    warehouse: {
      id: 301,
      name: "IMPORSHOP BILOXI",
      key_base_data: 301,
      city: {
        id: 802,
        name: "QUITO",
        department: { id: 43, name: "PICHINCHA", key_base_data: 43 },
        department_id: 43,
        key_base_data: 802,
      },
      city_id: 802,
    },
    warehouse_id: 301,
    supplier: {
      id: 9440,
      status: "Activo",
      role_id: 3,
      created_by: null,
      key_base_data: 9440,
    },
    supplier_id: 9440,
    user: {
      id: 94375,
      status: "Activo",
      role_id: 2,
      role_user: { id: 2, name: "DROPSHIPPER", key_base_data: 2 },
      key_base_data: 94375,
      white_brand_id: 1,
    },
    user_id: 94375,
    orderdetails: [
      {
        key_base_data: 3652437,
        product_id: 118301,
        quantity: 1,
        product: {
          id: 118301,
          sku: "IM-PRTAN",
          name: "CARRO TANQUE 2 EN 1 PR",
          type: "SIMPLE",
          active: true,
          sale_price: 16,
          suggested_price: 25,
          user_id: 9440,
          gallery: [
            {
              urlS3: "ecuador/products/118301/1763487413CapturaTANQUYE.PNG",
              key_base_data: 118301,
            },
          ],
          warehouse_product: [
            {
              warehouse: [
                {
                  name: "IMPORSHOP BILOXI",
                  city_id: 802,
                  user_id: 9440,
                  key_base_data: 301,
                },
              ],
              key_base_data: 118301,
              warehouse_id: 301,
            },
          ],
          warehouses: [],
        },
        variation: null,
        variation_id: null,
      },
    ],
    tags: [],
    shipping_guide: null,
    guia_urls3: null,
    guide_was_downloaded: false,
    sticker: null,
    warranty: false,
    warranty_type: null,
    colonia: null,
    coordinates: null,
    zip_code: null,
    indemnized: false,
    invoiced: false,
    invoice_id: null,
    servientrega_movements: [],
    novedad_servientrega: null,
  },
  {
    id: 3635973,
    dir: "Quito Pichincha 0962803007",
    city: "QUITO",
    name: "msxtattooing",
    surname: null,
    phone: "962803007",
    state: "PICHINCHA",
    status: "CANCELADO",
    rate_type: "CON RECAUDO",
    shipping_amount: 4.72,
    shipping_company: "VELOCES",
    total_order: 25,
    notes: null,
    created_at: "2025-11-27T14:23:43",
    updated_at: "2025-11-27T14:26:06",
    type: "FINAL_ORDER",
    tray: "ia_ventas",
    agent_assigned: "Imporfactory Admin",
    chat_id_cliente: 293150,
    chat_id_encargado: 274,
    shop: {
      id: 32404,
      name: "PANCAKE IMPORSHOP TIENDA",
      type: "PANCAKE",
      user_id: 94375,
      key_base_data: 32404,
    },
    shop_id: 32404,
    shop_order_id: "S714399779O2",
    shop_order_number: null,
    distribution_company: {
      id: 3,
      name: "VELOCES",
      color: null,
      is_veloces: false,
      key_base_data: 3,
    },
    distribution_company_id: 3,
    warehouse: {
      id: 301,
      name: "IMPORSHOP BILOXI",
      key_base_data: 301,
      city: {
        id: 802,
        name: "QUITO",
        department: { id: 43, name: "PICHINCHA", key_base_data: 43 },
        department_id: 43,
        key_base_data: 802,
      },
      city_id: 802,
    },
    warehouse_id: 301,
    supplier: {
      id: 9440,
      status: "Activo",
      role_id: 3,
      created_by: null,
      key_base_data: 9440,
    },
    supplier_id: 9440,
    user: {
      id: 94375,
      status: "Activo",
      role_id: 2,
      role_user: { id: 2, name: "DROPSHIPPER", key_base_data: 2 },
      key_base_data: 94375,
      white_brand_id: 1,
    },
    user_id: 94375,
    orderdetails: [
      {
        key_base_data: 3635973,
        product_id: 118301,
        quantity: 1,
        product: {
          id: 118301,
          sku: "IM-PRTAN",
          name: "CARRO TANQUE 2 EN 1 PR",
          type: "SIMPLE",
          active: true,
          sale_price: 16,
          suggested_price: 25,
          user_id: 9440,
          gallery: [
            {
              urlS3: "ecuador/products/118301/1763487413CapturaTANQUYE.PNG",
              key_base_data: 118301,
            },
          ],
          warehouse_product: [
            {
              warehouse: [
                {
                  name: "IMPORSHOP BILOXI",
                  city_id: 802,
                  user_id: 9440,
                  key_base_data: 301,
                },
              ],
              key_base_data: 118301,
              warehouse_id: 301,
            },
          ],
          warehouses: [],
        },
        variation: null,
        variation_id: null,
      },
    ],
    tags: [],
    shipping_guide: null,
    guia_urls3: null,
    guide_was_downloaded: false,
    sticker: null,
    warranty: false,
    warranty_type: null,
    colonia: null,
    coordinates: null,
    zip_code: null,
    indemnized: false,
    invoiced: false,
    invoice_id: null,
    servientrega_movements: [],
    novedad_servientrega: null,
  },
  {
    id: 3540572,
    dir: "nodespachar nodespachar -",
    city: "QUITO",
    name: "pedidoprueba",
    surname: "-",
    phone: "962803007",
    state: "PICHINCHA",
    status: "CANCELADO",
    rate_type: "CON RECAUDO",
    shipping_amount: 5.06,
    shipping_company: "VELOCES",
    total_order: 39.99,
    notes: null,
    created_at: "2025-11-19T10:07:20",
    updated_at: "2025-11-19T10:08:30",
    type: "FINAL_ORDER",
    tray: "ia_ventas",
    agent_assigned: "Imporfactory Admin",
    chat_id_cliente: 293150,
    chat_id_encargado: 274,
    shop: {
      id: 32204,
      name: "ImporshopTiendaa",
      type: "SHOPIFY",
      user_id: 94375,
      key_base_data: 32204,
    },
    shop_id: 32204,
    shop_order_id: "6952323350709",
    shop_order_number: 1086,
    distribution_company: {
      id: 3,
      name: "VELOCES",
      color: null,
      is_veloces: false,
      key_base_data: 3,
    },
    distribution_company_id: 3,
    warehouse: {
      id: 301,
      name: "IMPORSHOP BILOXI",
      key_base_data: 301,
      city: {
        id: 802,
        name: "QUITO",
        department: { id: 43, name: "PICHINCHA", key_base_data: 43 },
        department_id: 43,
        key_base_data: 802,
      },
      city_id: 802,
    },
    warehouse_id: 301,
    supplier: {
      id: 9440,
      status: "Activo",
      role_id: 3,
      created_by: null,
      key_base_data: 9440,
    },
    supplier_id: 9440,
    user: {
      id: 94375,
      status: "Activo",
      role_id: 2,
      role_user: { id: 2, name: "DROPSHIPPER", key_base_data: 2 },
      key_base_data: 94375,
      white_brand_id: 1,
    },
    user_id: 94375,
    orderdetails: [
      {
        key_base_data: 3540572,
        product_id: 106237,
        quantity: 1,
        product: {
          id: 106237,
          sku: "IMP-009-CALEFA",
          name: "Calentador Calefactor Aire Caliente",
          type: "SIMPLE",
          active: true,
          sale_price: 17,
          suggested_price: 30,
          user_id: 9440,
          gallery: [
            {
              urlS3: "ecuador/products/106237/1752872333calefactorv.JPG",
              key_base_data: 106237,
            },
          ],
          warehouse_product: [
            {
              warehouse: [
                {
                  name: "IMPORSHOP BILOXI",
                  city_id: 802,
                  user_id: 9440,
                  key_base_data: 301,
                },
              ],
              key_base_data: 106237,
              warehouse_id: 301,
            },
          ],
          warehouses: [],
        },
        variation: null,
        variation_id: null,
      },
    ],
    tags: [],
    shipping_guide: null,
    guia_urls3: null,
    guide_was_downloaded: false,
    sticker: null,
    warranty: false,
    warranty_type: null,
    colonia: null,
    coordinates: null,
    zip_code: null,
    indemnized: false,
    invoiced: false,
    invoice_id: null,
    servientrega_movements: [],
    novedad_servientrega: null,
  },
  {
    id: 3521245,
    dir: "nodespacar nodespacar -..",
    city: "QUITO",
    name: "nodespacharpedidoprueba",
    surname: "-",
    phone: "962803007",
    state: "PICHINCHA",
    status: "CANCELADO",
    rate_type: "CON RECAUDO",
    shipping_amount: 4.95,
    shipping_company: "GINTRACOM",
    total_order: 39.99,
    notes: null,
    created_at: "2025-11-17T16:13:00",
    updated_at: "2025-11-19T08:50:20",
    type: "FINAL_ORDER",
    tray: "ia_ventas",
    agent_assigned: "Imporfactory Admin",
    chat_id_cliente: 293150,
    chat_id_encargado: 274,
    shop: {
      id: 31739,
      name: "ImporshopTienda",
      type: "SHOPIFY",
      user_id: 94375,
      key_base_data: 31739,
    },
    shop_id: 31739,
    shop_order_id: "6948752031925",
    shop_order_number: 1083,
    distribution_company: {
      id: 4,
      name: "GINTRACOM",
      color: null,
      is_veloces: false,
      key_base_data: 4,
    },
    distribution_company_id: 4,
    warehouse: {
      id: 301,
      name: "IMPORSHOP BILOXI",
      key_base_data: 301,
      city: {
        id: 802,
        name: "QUITO",
        department: { id: 43, name: "PICHINCHA", key_base_data: 43 },
        department_id: 43,
        key_base_data: 802,
      },
      city_id: 802,
    },
    warehouse_id: 301,
    supplier: {
      id: 9440,
      status: "Activo",
      role_id: 3,
      created_by: null,
      key_base_data: 9440,
    },
    supplier_id: 9440,
    user: {
      id: 94375,
      status: "Activo",
      role_id: 2,
      role_user: { id: 2, name: "DROPSHIPPER", key_base_data: 2 },
      key_base_data: 94375,
      white_brand_id: 1,
    },
    user_id: 94375,
    orderdetails: [
      {
        key_base_data: 3521245,
        product_id: 106237,
        quantity: 1,
        product: {
          id: 106237,
          sku: "IMP-009-CALEFA",
          name: "Calentador Calefactor Aire Caliente",
          type: "SIMPLE",
          active: true,
          sale_price: 17,
          suggested_price: 30,
          user_id: 9440,
          gallery: [
            {
              urlS3: "ecuador/products/106237/1752872333calefactorv.JPG",
              key_base_data: 106237,
            },
          ],
          warehouse_product: [
            {
              warehouse: [
                {
                  name: "IMPORSHOP BILOXI",
                  city_id: 802,
                  user_id: 9440,
                  key_base_data: 301,
                },
              ],
              key_base_data: 106237,
              warehouse_id: 301,
            },
          ],
          warehouses: [],
        },
        variation: null,
        variation_id: null,
      },
    ],
    tags: [],
    shipping_guide: null,
    guia_urls3: null,
    guide_was_downloaded: false,
    sticker: null,
    warranty: false,
    warranty_type: null,
    colonia: null,
    coordinates: "[]",
    zip_code: null,
    indemnized: false,
    invoiced: false,
    invoice_id: null,
    servientrega_movements: [],
    novedad_servientrega: null,
  },
];

// Construir la respuesta mock con la misma estructura que el socket real
function buildMockResponse() {
  return {
    isSuccess: true,
    data: {
      isSuccess: true,
      status: 200,
      objects: MOCK_ORDERS,
    },
  };
}

export default function useDropiOrders({
  socketRef,
  id_configuracion,
  selectedChat,
  isOpen,
}) {
  // ── phone normalizado ──
  const phone = useMemo(() => {
    const raw =
      selectedChat?.celular_cliente ||
      selectedChat?.celular ||
      selectedChat?.phone ||
      null;
    if (!raw) return null;
    const clean = String(raw).replace(/\D/g, "");
    return clean || null;
  }, [selectedChat]);

  // ── estado ──
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // filtros
  const [resultNumber] = useState(20);
  const [status] = useState("");

  // refs para evitar duplicados
  const onOkRef = useRef(null);
  const onErrRef = useRef(null);
  const onUpdOkRef = useRef(null);
  const onUpdErrRef = useRef(null);
  const onSetStatusOkRef = useRef(null);
  const onSetStatusErrRef = useRef(null);

  // ── handler compartido para procesar respuesta de órdenes ──
  const handleOrdersResponse = useCallback((resp) => {
    setOrdersLoading(false);
    if (resp?.isSuccess && resp?.data?.isSuccess) {
      const list = resp?.data?.objects || [];
      setOrders(Array.isArray(list) ? list : []);
      return;
    }
    setOrdersError(
      resp?.data?.message || resp?.message || "Respuesta inválida",
    );
    setOrders([]);
  }, []);

  // ── emitters ──
  const emitGetOrders = useCallback(
    (extra = {}) => {
      // ━━━ MOCK: interceptar en localhost ━━━
      if (USE_MOCK) {
        console.log("[MOCK] emitGetOrders → devolviendo data mock de Dropi");
        setOrdersLoading(true);
        setOrdersError(null);
        setTimeout(() => {
          handleOrdersResponse(buildMockResponse());
        }, 400); // simular latencia de red
        return;
      }
      // ━━━ FIN MOCK ━━━

      const s = socketRef?.current;
      if (!s) {
        setOrdersError("Socket no está disponible");
        return;
      }
      if (!id_configuracion) {
        setOrdersError("Falta id_configuracion");
        return;
      }
      if (!phone) {
        setOrdersError("Falta teléfono del cliente");
        return;
      }

      setOrdersLoading(true);
      setOrdersError(null);

      s.emit("GET_DROPI_ORDERS_BY_CLIENT", {
        id_configuracion: Number(id_configuracion),
        phone,
        result_number: Number(resultNumber) || 20,
        status: status || undefined,
        ...extra,
      });
    },
    [
      socketRef,
      id_configuracion,
      phone,
      resultNumber,
      status,
      handleOrdersResponse,
    ],
  );

  const emitUpdateOrder = useCallback(
    (orderId, body) => {
      // ━━━ MOCK: interceptar en localhost ━━━
      if (USE_MOCK) {
        console.log("[MOCK] emitUpdateOrder →", orderId, body);
        // Actualizar la orden localmente en el mock
        setOrders((prev) =>
          prev.map((o) => (o.id === Number(orderId) ? { ...o, ...body } : o)),
        );
        setSelectedOrder(null);
        Swal.fire({
          icon: "success",
          title: "Orden actualizada (mock)",
          timer: 1300,
          showConfirmButton: false,
        });
        return;
      }
      // ━━━ FIN MOCK ━━━

      const s = socketRef?.current;
      if (!s) return;
      if (!id_configuracion) {
        Swal.fire({ icon: "warning", title: "Falta id_configuracion" });
        return;
      }
      if (!orderId) {
        Swal.fire({ icon: "warning", title: "Falta orderId" });
        return;
      }
      s.emit("DROPI_UPDATE_ORDER", {
        id_configuracion: Number(id_configuracion),
        orderId: Number(orderId),
        body,
      });
    },
    [socketRef, id_configuracion],
  );

  const emitSetOrderStatus = useCallback(
    (orderId, statusValue) => {
      // ━━━ MOCK: interceptar en localhost ━━━
      if (USE_MOCK) {
        console.log("[MOCK] emitSetOrderStatus →", orderId, statusValue);
        // Actualizar status localmente en el mock
        setOrders((prev) =>
          prev.map((o) =>
            o.id === Number(orderId) ? { ...o, status: statusValue } : o,
          ),
        );
        setSelectedOrder(null);
        Swal.fire({
          icon: "success",
          title: `Estado → ${statusValue} (mock)`,
          timer: 1200,
          showConfirmButton: false,
        });
        return;
      }
      // ━━━ FIN MOCK ━━━

      const s = socketRef?.current;
      if (!s) return;
      if (!id_configuracion) {
        Swal.fire({ icon: "warning", title: "Falta id_configuracion" });
        return;
      }
      if (!orderId) {
        Swal.fire({ icon: "warning", title: "Falta orderId" });
        return;
      }
      s.emit("DROPI_SET_ORDER_STATUS", {
        id_configuracion: Number(id_configuracion),
        orderId: Number(orderId),
        status: statusValue,
      });
    },
    [socketRef, id_configuracion],
  );

  // ── listeners de socket (solo en modo real) ──
  useEffect(() => {
    if (USE_MOCK) return; // no registrar listeners en mock

    const s = socketRef?.current;
    if (!s) return;

    // limpiar anteriores
    if (onOkRef.current) s.off("DROPI_ORDERS_BY_CLIENT", onOkRef.current);
    if (onErrRef.current)
      s.off("DROPI_ORDERS_BY_CLIENT_ERROR", onErrRef.current);
    if (onUpdOkRef.current) s.off("DROPI_UPDATE_ORDER_OK", onUpdOkRef.current);
    if (onUpdErrRef.current)
      s.off("DROPI_UPDATE_ORDER_ERROR", onUpdErrRef.current);
    if (onSetStatusOkRef.current)
      s.off("DROPI_SET_ORDER_STATUS_OK", onSetStatusOkRef.current);
    if (onSetStatusErrRef.current)
      s.off("DROPI_SET_ORDER_STATUS_ERROR", onSetStatusErrRef.current);

    const onOk = (resp) => handleOrdersResponse(resp);

    const onErr = (resp) => {
      setOrdersLoading(false);
      setOrdersError(resp?.message || "Error consultando órdenes");
      setOrders([]);
    };

    const onUpdOk = () => {
      Swal.fire({
        icon: "success",
        title: "Orden actualizada",
        timer: 1300,
        showConfirmButton: false,
      });
      emitGetOrders();
      setSelectedOrder(null);
    };

    const onUpdErr = (resp) => {
      Swal.fire({
        icon: "error",
        title: "No se pudo actualizar",
        text: resp?.message || "Error actualizando orden",
      });
    };

    const onSetStatusOk = () => {
      Swal.fire({
        icon: "success",
        title: "Estado actualizado",
        timer: 1200,
        showConfirmButton: false,
      });
      emitGetOrders();
      setSelectedOrder(null);
    };

    const onSetStatusErr = (resp) => {
      Swal.fire({
        icon: "error",
        title: "No se pudo cambiar el estado",
        text: resp?.message || "Error cambiando estado",
      });
    };

    onOkRef.current = onOk;
    onErrRef.current = onErr;
    onUpdOkRef.current = onUpdOk;
    onUpdErrRef.current = onUpdErr;
    onSetStatusOkRef.current = onSetStatusOk;
    onSetStatusErrRef.current = onSetStatusErr;

    s.on("DROPI_ORDERS_BY_CLIENT", onOk);
    s.on("DROPI_ORDERS_BY_CLIENT_ERROR", onErr);
    s.on("DROPI_UPDATE_ORDER_OK", onUpdOk);
    s.on("DROPI_UPDATE_ORDER_ERROR", onUpdErr);
    s.on("DROPI_SET_ORDER_STATUS_OK", onSetStatusOk);
    s.on("DROPI_SET_ORDER_STATUS_ERROR", onSetStatusErr);

    return () => {
      s.off("DROPI_ORDERS_BY_CLIENT", onOk);
      s.off("DROPI_ORDERS_BY_CLIENT_ERROR", onErr);
      s.off("DROPI_UPDATE_ORDER_OK", onUpdOk);
      s.off("DROPI_UPDATE_ORDER_ERROR", onUpdErr);
      s.off("DROPI_SET_ORDER_STATUS_OK", onSetStatusOk);
      s.off("DROPI_SET_ORDER_STATUS_ERROR", onSetStatusErr);
    };
  }, [socketRef, emitGetOrders, handleOrdersResponse]);

  const prevChatKeyRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const chatKey = `${selectedChat?.id || ""}_${selectedChat?.psid || ""}`;
    const chatChanged = chatKey !== prevChatKeyRef.current;
    prevChatKeyRef.current = chatKey;

    if (chatChanged) {
      setOrders([]);
      setOrdersError(null);
      setSelectedOrder(null);
    }

    // En mock no necesitamos phone real, pero mantenemos la misma lógica
    if (USE_MOCK || phone) emitGetOrders();
  }, [isOpen, selectedChat?.id, selectedChat?.psid, phone, emitGetOrders]);

  return {
    phone: USE_MOCK ? "962803007" : phone, // en mock siempre devolver phone válido
    orders,
    ordersLoading,
    ordersError,
    selectedOrder,
    setSelectedOrder,
    setOrders,
    setOrdersError,
    emitGetOrders,
    emitUpdateOrder,
    emitSetOrderStatus,
  };
}
