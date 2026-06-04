const mysql = require('mysql2/promise');

// Configuración básica y limpia para evitar warnings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'SoporteIT',
    charset: 'utf8mb4',
    timezone: '+00:00',
    
    // Configuraciones básicas de conexión
    connectTimeout: 30000,      // 30 segundos para establecer conexión
    supportBigNumbers: true,    // Soporte para números grandes
    bigNumberStrings: true,     // Convertir números grandes a strings
    dateStrings: true,         // Fechas como strings para evitar problemas de timezone
    
    // Configuraciones de seguridad
    ssl: false,                // SSL deshabilitado
    multipleStatements: false, // Una sola consulta por execute por seguridad
    
    // Configuraciones del pool de conexiones
    connectionLimit: 10,       // Máximo 10 conexiones simultáneas
    queueLimit: 0,            // Sin límite en cola de espera
    waitForConnections: true  // Esperar conexión disponible si pool está lleno
};

// Crear pool de conexiones
const pool = mysql.createPool(dbConfig);

// Variable para rastrear el estado del pool
let poolClosed = false;

/**
 * Función principal para obtener una conexión a la base de datos
 * Compatible con el código existente ODBC
 * @returns {Promise<Object>} - Objeto de conexión con métodos query() y close()
 */
async function connectionString() {
    if (poolClosed) {
        throw new Error('El pool de conexiones ha sido cerrado');
    }
    
    let connection = null;
    
    try {
        // Obtener conexión del pool
        connection = await pool.getConnection();
        
        // Configurar charset UTF-8 para caracteres especiales
        await connection.query('SET NAMES utf8mb4');
        await connection.query('SET character_set_results = utf8mb4');
        
        // Log solo en desarrollo
        if (process.env.NODE_ENV !== 'production') {
            
        }
        
        // Retornar objeto compatible con código ODBC existente
        return {
            /**
             * Ejecutar consulta SQL con parámetros
             * @param {string} sql - Consulta SQL
             * @param {Array} params - Parámetros para la consulta
             * @returns {Promise<Array>} - Resultados de la consulta
             */
            query: async (sql, params = []) => {
                try {
                    const [rows] = await connection.execute(sql, params);
                    return rows;
                } catch (error) {
                    console.error('❌ Error SQL:', error.message);
                    if (process.env.NODE_ENV === 'development') {
                        console.error('📄 Query:', sql);
                        console.error('📋 Params:', params);
                    }
                    throw error;
                }
            },
            
            /**
             * Cerrar/liberar la conexión al pool
             */
            close: async () => {
                try {
                    if (connection && !connection.destroyed) {
                        connection.release();
                        if (process.env.NODE_ENV === 'development') {
                            
                        }
                    }
                } catch (error) {
                    console.error('❌ Error liberando conexión:', error.message);
                }
            },
            
            /**
             * Verificar si la conexión está activa
             * @returns {boolean}
             */
            isActive: () => {
                return connection && !connection.destroyed;
            },
            
            // Propiedad para compatibilidad
            connection: connection
        };
        
    } catch (error) {
        // Limpiar conexión si falló la configuración
        if (connection) {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('❌ Error liberando conexión fallida:', releaseError.message);
            }
        }
        
        // Mejorar mensaje de error según el tipo
        let userMessage = 'Error de conexión a la base de datos';
        
        switch (error.code) {
            case 'ECONNREFUSED':
                userMessage = 'Servidor MySQL no disponible. Verificar que esté ejecutándose.';
                break;
            case 'ER_ACCESS_DENIED_ERROR':
                userMessage = 'Acceso denegado. Verificar credenciales de usuario.';
                break;
            case 'ER_BAD_DB_ERROR':
                userMessage = 'Base de datos "SoporteIT" no encontrada.';
                break;
            case 'ENOTFOUND':
                userMessage = 'Host localhost no encontrado. Verificar dirección IP.';
                break;
            case 'ETIMEDOUT':
                userMessage = 'Timeout de conexión. El servidor no responde.';
                break;
        }
        
        console.error('❌ Error de conexión:', error.message);
        throw new Error(`${userMessage}: ${error.message}`);
    }
}

/**
 * Probar la conexión a la base de datos
 * @returns {Promise<boolean>} - true si conexión exitosa
 */
async function testConnection() {
    try {
        const connection = await connectionString();
        const result = await connection.query('SELECT 1 as test, NOW() as timestamp');
        await connection.close();
        
        if (result && result.length > 0) {
            
            return true;
        }
        return false;
        
    } catch (error) {
        console.error('❌ Test de conexión falló:', error.message);
        return false;
    }
}

/**
 * Obtener información de la base de datos y servidor
 * @returns {Promise<Object>} - Información del servidor
 */
async function getDatabaseInfo() {
    try {
        const connection = await connectionString();
        
        // Consultas para obtener información del servidor
        const queries = await Promise.all([
            connection.query('SELECT VERSION() as version'),
            connection.query('SELECT DATABASE() as database'),
            connection.query('SELECT USER() as user'),
            connection.query('SELECT @@hostname as hostname'),
            connection.query('SELECT @@port as port')
        ]);
        
        await connection.close();
        
        return {
            version: queries[0][0].version,
            database: queries[1][0].database,
            user: queries[2][0].user,
            hostname: queries[3][0].hostname,
            port: queries[4][0].port,
            configHost: dbConfig.host
        };
        
    } catch (error) {
        console.error('❌ Error obteniendo info de BD:', error.message);
        throw error;
    }
}

/**
 * Verificar que las tablas principales del sistema existan
 * @returns {Promise<Object>} - Estado de las tablas
 */
async function checkSystemTables() {
    const requiredTables = ['personal', 'planillas', 'departamentos', 'PagoPlanilla', 'PagoPlanillaDetalle'];
    const tableStatus = {};
    
    try {
        const connection = await connectionString();
        
        for (const table of requiredTables) {
            try {
                const result = await connection.query(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
                tableStatus[table] = {
                    exists: true,
                    count: result[0].count
                };
            } catch (error) {
                tableStatus[table] = {
                    exists: false,
                    error: error.message
                };
            }
        }
        
        await connection.close();
        return tableStatus;
        
    } catch (error) {
        console.error('❌ Error verificando tablas:', error.message);
        throw error;
    }
}

/**
 * Cerrar el pool de conexiones de forma segura
 */
async function closePool() {
    if (poolClosed) {
        console.log('ℹ️ Pool ya está cerrado');
        return;
    }
    
    try {
        await pool.end();
        poolClosed = true;
        console.log('🏁 Pool de conexiones cerrado');
    } catch (error) {
        console.error('❌ Error cerrando pool:', error.message);
    }
}

/**
 * Obtener estadísticas del pool de conexiones
 * @returns {Object} - Estadísticas del pool
 */
function getPoolStats() {
    return {
        totalConnections: pool._allConnections ? pool._allConnections.length : 0,
        freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
        connectionQueue: pool._connectionQueue ? pool._connectionQueue.length : 0,
        acquiringConnections: pool._acquiringConnections ? pool._acquiringConnections.length : 0
    };
}

// Manejo de cierre graceful de la aplicación
process.on('SIGINT', async () => {
    console.log('\n🔄 Cerrando aplicación (SIGINT)...');
    await closePool();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🔄 Cerrando aplicación (SIGTERM)...');
    await closePool();
    process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', async (error) => {
    console.error('💥 Error no capturado:', error.message);
    await closePool();
    process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Promise rechazada:', reason);
    await closePool();
    process.exit(1);
});

// ── Segunda conexión: base de datos de Productos ──────────────────────────────
const dbConfigProductos = {
    host:     'localhost',        // ← IP o nombre del servidor
    user:     'root',        // ← usuario MySQL
    password: '1234',        // ← contraseña
    database: 'soporteit',        // ← nombre de la base de datos
    charset:  'utf8mb4',
    timezone: '+00:00',
    connectTimeout:    30000,
    supportBigNumbers: true,
    bigNumberStrings:  true,
    dateStrings:       true,
    ssl:               false,
    multipleStatements:false,
    connectionLimit:   10,
    queueLimit:        0,
    waitForConnections:true
};

const poolProductos = mysql.createPool(dbConfigProductos);

async function connectionStringProductos() {
    let connection = null;
    try {
        connection = await poolProductos.getConnection();
        await connection.query('SET NAMES utf8mb4');
        return {
            query: async (sql, params = []) => {
                try {
                    const [rows] = await connection.execute(sql, params);
                    return rows;
                } catch (error) {
                    console.error('❌ Error SQL Productos:', error.message);
                    throw error;
                }
            },
            beginTransaction: async () => await connection.beginTransaction(),
            commit:           async () => await connection.commit(),
            rollback:         async () => await connection.rollback(),
            close: async () => {
                if (connection && !connection.destroyed) connection.release();
            }
        };
    } catch (error) {
        if (connection) connection.release();
        console.error('❌ Error conexión Productos:', error.message);
        throw error;
    }
}
// ─────────────────────────────────────────────────────────────────────────────

// Exportar funciones públicas
module.exports = {
    connectionString,           // BD principal (Recursos)
    connectionStringProductos,  // BD de productos
    testConnection,
    getDatabaseInfo,
    checkSystemTables,
    closePool,
    getPoolStats,
    pool
};

// Auto-test cuando se ejecuta el archivo directamente
if (require.main === module) {
    (async () => {
        console.log('🚀 Iniciando test de conexión MySQL...\n');
        
        try {
            // Test básico
            const isConnected = await testConnection();
            if (!isConnected) {
                //console.log('❌ No se pudo establecer conexión');
                process.exit(1);
            }
            
            // Información del servidor
            console.log('\n📊 Información del servidor:');
            const info = await getDatabaseInfo();
            console.log(`   MySQL ${info.version}`);
            console.log(`   Base de datos: ${info.database}`);
            console.log(`   Usuario: ${info.user}`);
            console.log(`   Host: ${info.configHost} (${info.hostname}:${info.port})`);
            
            // Verificar tablas del sistema
            console.log('\n🗂️  Verificando tablas del sistema:');
            const tables = await checkSystemTables();
            Object.entries(tables).forEach(([table, status]) => {
                if (status.exists) {
                    console.log(`   ✅ ${table} (${status.count} registros)`);
                } else {
                    console.log(`   ❌ ${table} - ${status.error}`);
                }
            });
            
            console.log('\n🎉 Sistema listo para usar');
            
        } catch (error) {
            console.error('\n💥 Error en el test:', error.message);
            process.exit(1);
        } finally {
            await closePool();
        }
    })();
}