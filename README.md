# Asistente Constitucional Bolivia

Un asistente virtual de inteligencia artificial especializado en la **Constitución Política del Estado Plurinacional de Bolivia (2009)**.

## Descripcion

Este proyecto es un proof of concept que demuestra como la IA puede especializarse en dominios legales especificos. El asistente esta entrenado con la CPE Bolivia 2009 y documentos relacionados, permitiendo respuestas precisas y fundamentadas en derecho constitucional boliviano.

## Caracteristicas

- **Consultas Inteligentes**: Realiza preguntas sobre la Constitucion y obtiene respuestas fundamentadas
- **Base de Conocimiento**: Incluye la CPE Bolivia 2009 y el Codigo Procesal Constitucional
- **Interfaz Moderna**: Diseño responsivo con Bootstrap 5
- **Sugerencias Rapidas**: Preguntas predefinidas para facilitar la consulta
- **Backend Serverless**: API serverless con Vercel para manejo seguro de credenciales

## Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript, Bootstrap 5
- **Backend**: Vercel Serverless Functions (Node.js)
- **Modelo LLM**: Llama 3.3 70B via Groq API
- **Hosting**: Vercel

## Despliegue

### Requisitos
- Node.js
- Cuenta en Vercel
- API Key de Groq

### Pasos

1. Clona el repositorio
2. Instala Vercel CLI: `npm install -g vercel`
3. Ejecuta: `./scripts/deploy.sh`
4. Configura la variable de entorno `GROQ_API_KEY` en Vercel

## Estructura del Proyecto

```
abogado-constitucional/
├── index.html       # Pagina principal
├── api/
│   └── chat.js      # Serverless function para Groq
├── css/
│   └── styles.css   # Estilos personalizados
├── js/
│   └── app.js       # Logica del frontend
├── scripts/
│   ├── push.sh      # Script para push a GitHub
│   └── deploy.sh    # Script para deploy a Vercel
├── vercel.json      # Configuracion de Vercel
└── README.md
```

## Licencia

Este proyecto es un proof of concept con fines educativos.

---

Desarrollado con amor para el Estado Plurinacional de Bolivia
