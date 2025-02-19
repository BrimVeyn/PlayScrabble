import { useState, useEffect } from 'react'

function postUser(name: string, age: number) {
	fetch("http://localhost:8080/api/addUser", {
		method: "POST",
		body: JSON.stringify({ name, age }),
	})
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.json();
		})
		.then((data) => console.log("User added successfully:", data))
		.catch((error) => console.error("Error adding user:", error));
}

function App() {
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    fetch('http://localhost:8080/api/hello')
      .then(response => response.json())
      .then(data => setData(data.message))
      .catch(error => console.error('Error fetching data:', error));

    fetch('http://localhost:8080/api/getUsers')
      .then(response => response.json())
      .then(data => setData(data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <>
      <h1>Vite + React</h1>
      <p>Backend response: {data || "Loading..."}</p>
	  <button onClick={() => postUser("Nathan", 12)}> Test </button>
    </>
  )
}

export default App

