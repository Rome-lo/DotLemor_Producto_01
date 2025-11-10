// frontend/js/api-client.js
/**
 * Cliente HTTP para comunicación con el backend REST API
 */

export class APIClient {
  constructor(baseUrl, timeout = 5000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  async request(endpoint, options = {}, attempt = 1) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      
      // Verificar si la respuesta es OK
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Si fue abort por timeout
      if (error.name === 'AbortError') {
        error.message = 'Request timeout';
      }
      
      console.error(`Error en ${endpoint} (intento ${attempt}):`, error.message);
      
      // Reintentar si no se alcanzó el límite
      if (attempt < this.maxRetries) {
        console.log(`🔄 Reintentando... (${attempt + 1}/${this.maxRetries})`);
        await this.sleep(this.retryDelay * attempt);
        return this.request(endpoint, options, attempt + 1);
      }
      
      throw error;
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    });
  }

  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}