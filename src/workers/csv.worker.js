import { parseAndNormalizeCsv } from '../utils/csvParserLogic';

// El worker escucha mensajes del hilo principal
self.onmessage = (e) => {
  const file = e.data;
  const reader = new FileReader();

  reader.onload = (event) => {
    const csvText = event.target.result;
    parseAndNormalizeCsv(csvText)
      .then(normalizedData => {
        self.postMessage({ type: 'COMPLETE', payload: normalizedData });
      })
      .catch(error => {
        self.postMessage({ type: 'ERROR', payload: error.message });
      });
  };

  reader.onerror = (error) => {
    self.postMessage({ type: 'ERROR', payload: 'Error al leer el archivo.' });
  };

  reader.readAsText(file);
};
