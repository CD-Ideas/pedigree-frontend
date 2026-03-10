"use client";

import { FormEvent, useEffect, useState } from "react";

type Dog = {
  id: number;
  name: string;
  breed: string;
  sex: string;
  dateOfBirth: string;
  sire?: string;
  dam?: string;
  sire_id?: number | null;
  dam_id?: number | null;
};

export default function DogsPage() {
  const [dogName, setDogName] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("Male");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sire, setSire] = useState("");
  const [dam, setDam] = useState("");
  const [sireId, setSireId] = useState("");
  const [damId, setDamId] = useState("");
  const [message, setMessage] = useState("");
  const [dogs, setDogs] = useState<Dog[]>([]);

  useEffect(() => {
    async function loadDogs() {
      try {
        const res = await fetch("/api/dogs");
        const data = await res.json();

        if (Array.isArray(data)) {
          setDogs(data);
        }
      } catch (error) {
        console.error("Failed to load dogs", error);
      }
    }

    loadDogs();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const response = await fetch("/api/dogs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: dogName,
        breed,
        sex,
        dateOfBirth,
        sire,
        dam,
        sire_id: sireId ? Number(sireId) : null,
        dam_id: damId ? Number(damId) : null,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      setMessage("Dog saved successfully!");
      setDogName("");
      setBreed("");
      setSex("Male");
      setDateOfBirth("");
      setSire("");
      setDam("");
      setSireId("");
      setDamId("");

      const refreshed = await fetch("/api/dogs");
      const refreshedData = await refreshed.json();

      if (Array.isArray(refreshedData)) {
        setDogs(refreshedData);
      }
    } else {
      setMessage(data.error || "Error saving dog");
    }
  }

  const maleDogs = dogs.filter((dog) => dog.sex === "Male");
  const femaleDogs = dogs.filter((dog) => dog.sex === "Female");

  return (
    <main style={{ padding: "60px", fontFamily: "Arial" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <h1>Dog Registration</h1>
        <a href="/dashboard">Back to Dashboard</a>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ maxWidth: "600px", display: "grid", gap: "20px" }}
      >
        <input
          placeholder="Dog Name"
          value={dogName}
          onChange={(e) => setDogName(e.target.value)}
        />

        <input
          placeholder="Breed"
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
        />

        <select value={sex} onChange={(e) => setSex(e.target.value)}>
          <option>Male</option>
          <option>Female</option>
        </select>

        <input
          type="date"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />

        <div>
          <label>Sire (Father)</label>
          <select
            value={sireId}
            onChange={(e) => {
              const selectedId = e.target.value;
              setSireId(selectedId);

              const selectedDog = maleDogs.find(
                (dog) => String(dog.id) === selectedId
              );

              setSire(selectedDog ? selectedDog.name : "");
            }}
          >
            <option value="">Select sire</option>
            {maleDogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.name} - {dog.breed}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Dam (Mother)</label>
          <select
            value={damId}
            onChange={(e) => {
              const selectedId = e.target.value;
              setDamId(selectedId);

              const selectedDog = femaleDogs.find(
                (dog) => String(dog.id) === selectedId
              );

              setDam(selectedDog ? selectedDog.name : "");
            }}
          >
            <option value="">Select dam</option>
            {femaleDogs.map((dog) => (
              <option key={dog.id} value={dog.id}>
                {dog.name} - {dog.breed}
              </option>
            ))}
          </select>
        </div>

        <button type="submit">Save Dog</button>

        {message && <p>{message}</p>}
      </form>
    </main>
  );
}
