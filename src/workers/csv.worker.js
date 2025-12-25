import { parseAndNormalizeCsv, parseDictionaryCsv } from '../utils/csvParserLogic';

// El worker escucha mensajes del hilo principal
self.onmessage = (e) => {
  // CRÍTICO: Extraemos el archivo y el modo del "sobre" (e.data)
  const { file, mode } = e.data;

  if (!file) {
    self.postMessage({ type: 'ERROR', payload: 'Error: No se recibió ningún archivo en el worker.' });
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    const csvText = event.target.result;
    let promise;
    if (mode === 'dictionary') {
      promise = parseDictionaryCsv(csvText).then(dictionaryData => {
        self.postMessage({ type: 'COMPLETE_DICTIONARY', payload: dictionaryData });
      });
    } else { // El modo por defecto es 'stock'
      promise = parseAndNormalizeCsv(csvText).then(result => {
        self.postMessage({ type: 'COMPLETE_STOCK', payload: result });
      });
    }

    promise
      .catch(error => {
        self.postMessage({ type: 'ERROR', payload: error.message });
      });
  };

  reader.onerror = (error) => {
    self.postMessage({ type: 'ERROR', payload: 'Error al leer el archivo.' });
  };

  // Pasamos SOLO el archivo (que es un Blob) al lector.
  reader.readAsText(file);
};
