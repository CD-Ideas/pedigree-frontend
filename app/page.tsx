
 export default function Home() {
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
       <h1 style={{ fontSize: "40px", fontWeight: "bold", color: "#111827" }}>
         Dog Pedigree Platform
       </h1>

       <p style={{ marginTop: "10px", fontSize: "18px", color: "#374151" }}>
         Your frontend is successfully running on AWS EC2 🚀
       </p>

       <div
         style={{
           marginTop: "40px",
           display: "grid",
           gridTemplateColumns: "repeat(3, 1fr)",
           gap: "20px",
         }}
       >
         <div
           style={{
             background: "white",
             padding: "20px",
             borderRadius: "10px",
             border: "1px solid #d1d5db",
           }}
         >
           <h2 style={{ color: "#111827" }}>Dogs</h2>
           <p style={{ color: "#4b5563" }}>Register and manage dogs</p>
         </div>

         <div
           style={{
             background: "white",
             padding: "20px",
             borderRadius: "10px",
             border: "1px solid #d1d5db",
           }}
         >
           <h2 style={{ color: "#111827" }}>Breeders</h2>
           <p style={{ color: "#4b5563" }}>Manage breeder records</p>
         </div>

         <div
           style={{
             background: "white",
             padding: "20px",
             borderRadius: "10px",
             border: "1px solid #d1d5db",
           }}
         >
           <h2 style={{ color: "#111827" }}>Pedigrees</h2>
           <p style={{ color: "#4b5563" }}>View bloodline history</p>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
          }}
        >
          <h2 style={{ color: "#111827" }}>Kennels</h2>
          <p style={{ color: "#4b5563" }}>Organize kennel data</p>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
          }}
        >
          <h2 style={{ color: "#111827" }}>Litters</h2>
          <p style={{ color: "#4b5563" }}>Track breeding records</p>
        </div>

        <div
          style={{
            background: "white",
            padding: "20px",
            borderRadius: "10px",
            border: "1px solid #d1d5db",
          }}
        >
          <h2 style={{ color: "#111827" }}>Health Records</h2>
          <p style={{ color: "#4b5563" }}>Store dog health information</p>
        </div>
      </div>
    </main>
  );
}
