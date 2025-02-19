import { useState, useEffect } from 'react'

function App() {
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/hello')
      .then(response => response.json())
      .then(data => setData(data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <>
      <h1>Vite + React</h1>
      <p>Backend response: {data || "Loading..."}</p>
    </>
  )
}

export default App

