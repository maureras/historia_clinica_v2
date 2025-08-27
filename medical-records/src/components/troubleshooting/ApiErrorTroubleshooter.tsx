// src/components/troubleshooting/ApiErrorTroubleshooter.tsx
import React, { useState } from 'react'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Terminal,
  Globe,
  Server,
  Settings,
  Copy,
  ExternalLink,
  Book,
  Lightbulb,
  Code,
  Network
} from 'lucide-react'
import { Card, Button, Alert } from '@/components/ui'

interface ApiErrorTroubleshooterProps {
  error: string
  apiUrl?: string
  onRetry?: () => void
  onUseMockData?: () => void
  className?: string
}

export const ApiErrorTroubleshooter: React.FC<ApiErrorTroubleshooterProps> = ({
  error,
  apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  onRetry,
  onUseMockData,
  className = ''
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<string | null>(null)

  // Detectar tipo de error
  const getErrorType = (errorMsg: string) => {
    if (errorMsg.includes('<!DOCTYPE') || errorMsg.includes('<!doctype')) {
      return 'html_instead_json'
    }
    if (errorMsg.includes('TypeError') && errorMsg.includes('fetch')) {
      return 'network_error'
    }
    if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT')) {
      return 'timeout'
    }
    if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
      return 'endpoint_not_found'
    }
    if (errorMsg.includes('500') || errorMsg.includes('Internal Server')) {
      return 'server_error'
    }
    if (errorMsg.includes('CORS')) {
      return 'cors_error'
    }
    return 'unknown'
  }

  const errorType = getErrorType(error)

  const getErrorDetails = (type: string) => {
    switch (type) {
      case 'html_instead_json':
        return {
          title: 'Recibiendo HTML en lugar de JSON',
          description: 'La API está devolviendo una página HTML (probablemente 404 o error) en lugar de datos JSON.',
          icon: <Code className="h-5 w-5 text-orange-600" />,
          color: 'orange',
          solutions: [
            'Verificar que el endpoint de la API exista y esté correcto',
            'Confirmar que el backend esté ejecutándose',
            'Revisar la configuración de rutas del servidor',
            'Verificar variables de entorno (REACT_APP_API_URL)',
            'Comprobar configuración de proxy en desarrollo'
          ],
          technicalInfo: `El error "Unexpected token '<', '<!doctype'" indica que JavaScript está intentando hacer JSON.parse() de contenido HTML. Esto sucede cuando el servidor devuelve una página web (como 404.html) en lugar de una respuesta JSON.`
        }
      case 'network_error':
        return {
          title: 'Error de Red',
          description: 'No se puede establecer conexión con el servidor API.',
          icon: <Network className="h-5 w-5 text-red-600" />,
          color: 'red',
          solutions: [
            'Verificar que el servidor backend esté ejecutándose',
            'Comprobar la URL de la API en variables de entorno',
            'Verificar conectividad de red',
            'Revisar configuración de firewall',
            'Comprobar puertos disponibles'
          ],
          technicalInfo: 'Error de conectividad de red. El navegador no puede alcanzar el servidor en la URL especificada.'
        }
      case 'endpoint_not_found':
        return {
          title: 'Endpoint No Encontrado (404)',
          description: 'La ruta de la API solicitada no existe en el servidor.',
          icon: <Globe className="h-5 w-5 text-blue-600" />,
          color: 'blue',
          solutions: [
            'Verificar la ruta del endpoint en el código',
            'Confirmar que la ruta esté definida en el backend',
            'Revisar la configuración de routing del servidor',
            'Verificar que el controlador esté registrado',
            'Comprobar métodos HTTP (GET, POST, etc.)'
          ],
          technicalInfo: 'El servidor responde pero la ruta específica no está definida o no es accesible.'
        }
      case 'server_error':
        return {
          title: 'Error del Servidor (500)',
          description: 'El servidor encontró un error interno al procesar la solicitud.',
          icon: <Server className="h-5 w-5 text-red-600" />,
          color: 'red',
          solutions: [
            'Revisar logs del servidor backend',
            'Verificar configuración de base de datos',
            'Comprobar variables de entorno del servidor',
            'Verificar permisos de archivos y directorios',
            'Revisar dependencias del servidor'
          ],
          technicalInfo: 'Error interno del servidor. Revisar logs del backend para más detalles.'
        }
      case 'timeout':
        return {
          title: 'Tiempo de Espera Agotado',
          description: 'La solicitud tardó demasiado en responder.',
          icon: <RefreshCw className="h-5 w-5 text-yellow-600" />,
          color: 'yellow',
          solutions: [
            'Verificar rendimiento del servidor',
            'Aumentar timeout de las solicitudes',
            'Optimizar consultas de base de datos',
            'Verificar recursos del servidor (CPU, memoria)',
            'Comprobar latencia de red'
          ],
          technicalInfo: 'La solicitud fue cancelada por timeout. El servidor puede estar sobrecargado o la consulta ser muy lenta.'
        }
      default:
        return {
          title: 'Error Desconocido',
          description: 'Se produjo un error no identificado.',
          icon: <AlertTriangle className="h-5 w-5 text-gray-600" />,
          color: 'gray',
          solutions: [
            'Revisar consola del navegador para más detalles',
            'Verificar logs del servidor',
            'Intentar recargar la página',
            'Limpiar caché del navegador',
            'Contactar al equipo técnico'
          ],
          technicalInfo: error
        }
    }
  }

  const details = getErrorDetails(errorType)

  const testConnection = async () => {
    setTestingConnection(true)
    setConnectionResult(null)

    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          setConnectionResult('✅ Conexión exitosa - API respondiendo correctamente')
        } else {
          setConnectionResult(`⚠️ Servidor responde pero devuelve ${contentType} en lugar de JSON`)
        }
      } else {
        setConnectionResult(`❌ Error HTTP ${response.status}: ${response.statusText}`)
      }
    } catch (err: any) {
      setConnectionResult(`❌ Error de conexión: ${err.message}`)
    } finally {
      setTestingConnection(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Alert */}
      <Alert variant="error">
        <AlertTriangle className="h-4 w-4" />
        <div>
          <p className="font-medium">Error de API</p>
          <p className="text-sm">{error}</p>
        </div>
      </Alert>

      {/* Error Type Card */}
      <Card variant="default" className="p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg bg-${details.color}-100`}>
            {details.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{details.title}</h3>
            <p className="text-slate-600 mb-4">{details.description}</p>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mb-4">
              {onRetry && (
                <Button variant="primary" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Probar Conexión
              </Button>
              {onUseMockData && (
                <Button variant="outline" size="sm" onClick={onUseMockData}>
                  <Settings className="h-4 w-4 mr-2" />
                  Usar Datos Demo
                </Button>
              )}
            </div>

            {/* Connection Test Result */}
            {connectionResult && (
              <div className="p-3 bg-slate-50 rounded-lg border mb-4">
                <pre className="text-sm font-mono">{connectionResult}</pre>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Solutions */}
      <Card variant="default" className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          Soluciones Recomendadas
        </h3>
        <div className="space-y-3">
          {details.solutions.map((solution, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">
                {index + 1}
              </div>
              <p className="text-slate-700">{solution}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Technical Details (Collapsible) */}
      <Card variant="default" className="p-6">
        <button
          className="flex items-center justify-between w-full text-left"
          onClick={() => setShowDetails(!showDetails)}
        >
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Terminal className="h-5 w-5 text-slate-600" />
            Detalles Técnicos
          </h3>
          <RefreshCw className={`h-4 w-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} />
        </button>
        
        {showDetails && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border">
              <h4 className="font-medium text-slate-900 mb-2">Información del Error</h4>
              <p className="text-sm text-slate-700">{details.technicalInfo}</p>
            </div>
            
            <div className="p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-900">Configuración Actual</h4>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => copyToClipboard(JSON.stringify({
                    apiUrl,
                    environment: process.env.NODE_ENV,
                    timestamp: new Date().toISOString(),
                    error: error
                  }, null, 2))}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <div className="text-sm space-y-1">
                <div><span className="font-medium">API URL:</span> <code>{apiUrl}</code></div>
                <div><span className="font-medium">Environment:</span> <code>{process.env.NODE_ENV}</code></div>
                <div><span className="font-medium">Error Original:</span> <code>{error}</code></div>
                <div><span className="font-medium">Timestamp:</span> <code>{new Date().toISOString()}</code></div>
              </div>
            </div>

            {/* Enlaces de Documentación */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <Book className="h-4 w-4" />
                Recursos de Ayuda
              </h4>
              <div className="text-sm space-y-2">
                <a 
                  href="https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-700 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                  Fetch API Documentation
                </a>
                <a 
                  href="https://stackoverflow.com/questions/tagged/fetch-api+json" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-700 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                  Stack Overflow - Fetch API Issues
                </a>
                <a 
                  href="https://create-react-app.dev/docs/proxying-api-requests-in-development/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-700 hover:text-blue-800"
                >
                  <ExternalLink className="h-3 w-3" />
                  React Proxy Configuration
                </a>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}