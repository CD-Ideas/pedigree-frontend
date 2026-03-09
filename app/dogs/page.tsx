export default function DogsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f4f4f5",
        padding: "60px",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
      }}
    >
      <h1 style={{ fontSize: "36px", fontWeight: "bold", marginBottom: "10px" }}>
        Dog Registration
      </h1>

      <p style={{ marginBottom: "30px", color: "#4b5563" }}>
        Add a new dog to your pedigree platform.
      </p>

      <form
        style={{
          background: "#ffffff",
          padding: "30px",
          borderRadius: "12px",
          border: "1px solid #d1d5db",
          maxWidth: "700px",
          display: "grid",
          gap: "20px",
        }}
      >
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
            Dog Name
          </label>
          <input
            type="text"
            placeholder="Enter dog name"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
            Breed
          </label>
          <input
            type="text"
            placeholder="Enter breed"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
            Sex
          </label>
          <select
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          >
            <option>Male</option>
            <option>Female</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
            Date of Birth
          </label>
          <input
            type="date"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
            Sire (Father)
          </label>
          <input
            type="text"
            placeholder="Enter sire name"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600 }}>
            Dam (Mother)
          </label>
          <input
            type="text"
            placeholder="Enter dam name"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            background: "#111827",
            color: "white",
            padding: "14px 20px",
            borderRadius: "10px",
            border: "none",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Save Dog
        </button>
      </form>
    </main>
  );
}
