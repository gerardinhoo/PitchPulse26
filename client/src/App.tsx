import { useEffect, useState } from "react";

const App = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("http://localhost:5050/api/health")
      .then(res => res.json())
      .then(data => setMessage(data.status));
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-2xl font-bold">
        {message || "Loading..."}
      </h1>
    </div>
  );
}

export default App;