# ==========================================
# Etapa 1: Construcción (Build)
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Instalar todas las dependencias
RUN npm ci

# Copiar código fuente
COPY src ./src
COPY public ./public

# Compilar TypeScript a JavaScript en dist/
RUN npm run build

# ==========================================
# Etapa 2: Entorno de Producción Ligero
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Copiar dependencias de producción y binarios compilados
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Exponer el puerto
EXPOSE 4000

# Comando de inicio
CMD ["node", "dist/main.js"]
