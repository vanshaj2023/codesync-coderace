export const executeOnCompiler = async (wrappedCode, language) => {
  const rapidApiKey = process.env.RAPIDAPI_KEY; 
  const host = 'onecompiler-apis.p.rapidapi.com';
  
  // Mapping our languages to OneCompiler's internal language IDs
  const langMapping = {
    python: 'python',
    cpp: 'cpp',
    java: 'java'
  };

  try {
    const response = await fetch(`https://${host}/api/v1/run`, {
      method: 'POST',
      headers: {
        'x-rapidapi-key': rapidApiKey,
        'x-rapidapi-host': host,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        language: langMapping[language],
        files: [
          {
            name: language === 'java' ? 'Main.java' : language === 'cpp' ? 'main.cpp' : 'main.py',
            content: wrappedCode
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error("Execution Engine Error:", error);
    throw new Error('Failed to communicate with the compiler engine');
  }
};