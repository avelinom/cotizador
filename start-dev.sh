#!/bin/bash

# Script para iniciar el ambiente de desarrollo del Cotizador

echo "🚀 Iniciando Cotizador - Ambiente de Desarrollo"
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si los puertos están ocupados
if lsof -Pi :3005 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Puerto 3005 (Backend) ya está en uso${NC}"
    echo "   ¿Deseas detener el proceso? (Ctrl+C para cancelar)"
    read -p "   Presiona Enter para continuar..."
    lsof -ti :3005 | xargs kill -9 2>/dev/null
    sleep 1
fi

if lsof -Pi :3006 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${YELLOW}⚠️  Puerto 3006 (Frontend) ya está en uso${NC}"
    echo "   ¿Deseas detener el proceso? (Ctrl+C para cancelar)"
    read -p "   Presiona Enter para continuar..."
    lsof -ti :3006 | xargs kill -9 2>/dev/null
    sleep 1
fi

# Verificar que la base de datos existe
echo "📊 Verificando base de datos..."
if psql -U amiguelez -d cotizador_db -c "SELECT 1" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Base de datos conectada${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo conectar a la base de datos${NC}"
    echo "   Asegúrate de que PostgreSQL esté corriendo y la BD exista"
fi

echo ""
echo "📦 Iniciando Backend en puerto 3005..."
cd "$(dirname "$0")/backend"
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"
echo "   Logs: backend.log"

sleep 3

echo ""
echo "📦 Iniciando Frontend en puerto 3006..."
cd "$(dirname "$0")/frontend"
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"
echo "   Logs: frontend.log"

sleep 5

echo ""
echo -e "${GREEN}✅ Servicios iniciados${NC}"
echo ""
echo "📍 URLs:"
echo "   Backend:  http://localhost:3005"
echo "   Frontend: http://localhost:3006"
echo ""
echo "🔐 Credenciales:"
echo "   Email:    admin@cotizador.com"
echo "   Password: admin123"
echo ""
echo "📋 Para detener los servicios:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📝 Ver logs:"
echo "   tail -f backend.log"
echo "   tail -f frontend.log"
echo ""
echo "🌐 Abre http://localhost:3006 en tu navegador"

# Esperar a que el usuario presione Ctrl+C
trap "echo ''; echo '🛑 Deteniendo servicios...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait

