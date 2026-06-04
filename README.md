# Taller floral en Salto

Landing estática con servidor Node para Meta Pixel y Conversions API.

## Ejecutar localmente

```bash
npm start
```

La página queda disponible en `http://localhost:4173`.

## Variables privadas

Copiar `.env.example` a `.env.local` y completar:

```bash
META_PIXEL_ID=996195842979937
META_CAPI_ACCESS_TOKEN=...
PORT=4173
```

`.env.local` no se versiona para no exponer el token de Meta CAPI.

## Pagina de gracias

La pagina post-pago esta disponible en `/gracias`.

Debe configurarse como URL de retorno en Mercado Pago para que, al llegar ahi, dispare el
evento `Purchase` por Meta Pixel y Conversions API. La pagina tambien muestra los datos para
enviar comprobante por WhatsApp.
