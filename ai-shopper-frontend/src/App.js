import { useState, useEffect, useRef } from "react";
import { IoPaperPlaneSharp } from "react-icons/io5";
import { FaHistory } from "react-icons/fa";
import { IoClose } from "react-icons/io5";

import cat from "./assets/cat.png";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [formData, setFormData] = useState({});
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);

  const chatRef = useRef(null);

  // AUTO SCROLL
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // BOT MESSAGE
  const addBot = (text) => {
    setMessages((prev) => [...prev, { sender: "bot", text, id: Date.now() + Math.random(), }]);
  };

  // USER MESSAGE
  const addUser = (text) => {
    setMessages((prev) => [...prev, { sender: "user", text, id: Date.now() + Math.random(), }]);
  };

  // FORMAT PRICE
  const formatPrice = (price) => {
    if (!price || price === "N/A") return "₹0";
    let number = parseFloat(String(price).replace(/[^\d.]/g, "")) || 0;
    if (number < 1000 && number > 0) {
      number = number * 83;
    }
    return `₹${Math.round(number).toLocaleString("en-IN")}`;
  };

  // SHORT TITLE
  const shortTitle = (title) => {
    if (!title) return "";
    return title.split(" ").slice(0, 5).join(" ");
  };

  // SEND
  const handleSend = () => {
    if (!input.trim()) return;
    if (waitingForResponse || loading) return;
    if (introVisible) setIntroVisible(false);
    addUser(input);
    processInput(input);
    setInput("");
  };

  // PRODUCT CARD
  const renderProductCard = (item, index, small = false) => {
    const imageUrl = item.image || "";
    const title = item.title || "Product";
    const price = item.price || 0;
    const link = item.link || "#";
    
    return (
      <div
        key={index}
        style={{
          minWidth: small ? "135px" : "220px",
          maxWidth: small ? "135px" : "220px",
          padding: small ? "10px" : "16px",
          borderRadius: "16px",
          background: "linear-gradient(135deg,rgba(96,165,250,0.1),rgba(192,132,252,0.1))",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
        }}
      >
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: "100%",
              height: small ? "120px" : "220px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/200x200?text=No+Image";
            }}
          />
        )}
        <h3
          style={{
            fontSize: small ? "10px" : "14px",
            marginTop: "10px",
            lineHeight: "1.4",
            minHeight: small ? "30px" : "40px",
          }}
        >
          {shortTitle(title)}
        </h3>
        <h2
          style={{
            color: "#c084fc",
            marginTop: "10px",
            fontSize: small ? "16px" : "24px",
          }}
        >
          {formatPrice(price)}
        </h2>
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: "10px",
            padding: small ? "7px" : "10px",
            borderRadius: "10px",
            background: "linear-gradient(135deg,#ec4899,#8b5cf6)",
            textDecoration: "none",
            color: "white",
            fontSize: small ? "11px" : "13px",
            fontWeight: "600",
          }}
        >
          Buy Now
        </a>
      </div>
    );
  };

  // RENDER RESULTS AS MESSAGE
  const addResultMessage = (data, res) => {
    const resultComponent = {
      sender: "bot",
      type: "results",
      occasion: data.occasion,
      data: res,
      outfits: data.outfits,
     id: Date.now() + Math.random(),
    };
    setMessages((prev) => [...prev, resultComponent]);
  };

  // CHAT FLOW
  const processInput = (text) => {
    let data = { ...formData };
    const lower = text.toLowerCase();

    // RESTART
    if (!loading && (lower.includes("another") || lower.includes("one more") || lower.includes("new outfit"))) {
      setConversationActive(false);
      setStep(1);
      setFormData({});
      addBot("Great ✨ Are you male or female?");
      return;
    }

    // START CHAT
    if (step === 0 && !conversationActive) {
      setConversationActive(true);
      setStep(1);
      addBot("Are you male or female?");
      return;
    }

    // GENDER
    if (step === 1) {
      if (lower !== "male" && lower !== "female") {
        addBot("Please type Male or Female ✨");
        return;
      }
      data.gender = lower;
      addBot("What's your age?");
      setStep(2);
    }
    // AGE
    else if (step === 2) {
      const ageNum = parseInt(text);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        addBot("What's your age?");
        return;
      }
      data.age = ageNum;
      addBot("What's the occasion?");
      setStep(3);
    }
    // OCCASION
    else if (step === 3) {
      data.occasion = text;
      addBot("What outfit are you looking for?");
      setStep(4);
    }
    // OUTFIT
    else if (step === 4) {
      let outfitsArray = [];
      if (text.includes(" and ") || text.includes(",")) {
        outfitsArray = text.split(/ and |, /).map(item => item.trim().toLowerCase());
      } else {
        outfitsArray = [text.trim().toLowerCase()];
      }
      
      data.outfits = outfitsArray;
      addBot(`What's your budget in Rs. ?`);
      setStep(5);
    }
    // BUDGET
    else if (step === 5) {
      const budgetNum = parseInt(text.replace(/[^\d]/g, ""));
      if (isNaN(budgetNum) || budgetNum < 100) {
        addBot("Please enter a valid budget (minimum ₹100)");
        return;
      }
      data.budget = budgetNum;
      setLoading(true);
      setWaitingForResponse(true);
      fetchResults(data);
    }

    setFormData(data);
  };

  // FETCH RESULTS
  const fetchResults = async (data) => {
    try {
      const response = await fetch("https://fashion-ai-pro.onrender.com/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gender: data.gender,
          age: data.age,
          occasion: data.occasion,
          outfits: data.outfits,
          budget: data.budget,
        }),
      });

      const res = await response.json();
      console.log("Backend Response:", res);
      
      // Check if response has products or combos
      const hasProducts = res.products && Object.keys(res.products).length > 0;
      const hasTopCombos = res.top_combos && res.top_combos.length > 0;
      
      if (!hasProducts && !hasTopCombos) {
        setLoading(false);
        setWaitingForResponse(false);
        addBot(`😅 Sorry, I couldn't find any ${data.outfits.join(", ")} options within ₹${data.budget.toLocaleString("en-IN")}. Try increasing your budget or choosing different outfits!`);
        setFormData({});
        setStep(0);
        setConversationActive(false);
        return;
      }

      const resultBlock = {
        id: Date.now() + Math.random(),
        occasion: data.occasion,
        timestamp: new Date().toLocaleString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        data: res,
        userSelections: {
          gender: data.gender,
          age: data.age,
          occasion: data.occasion,
          outfit: data.outfits.join(", "),
          budget: data.budget
        }
      };

      setHistory((prev) => [resultBlock, ...prev]);

      setLoading(false);
      setWaitingForResponse(false);

      // Add the results as a special message
      addResultMessage(data, res);

      // Add the prompt for next outfit
      addBot("💡 Need another outfit suggestion? Type 'another outfit' ✨");

      setFormData({});
      setStep(0);
      setConversationActive(false);
    } catch (err) {
      console.error("Fetch error:", err);
      setLoading(false);
      setWaitingForResponse(false);
      addBot("Something went wrong 😢 Please try again.");
    }
  };

  // Render a results message
  const renderResultsMessage = (message) => {
    const block = message;
    
    return (
      <div
        key={block.id}
        style={{
          marginTop: "20px",
          marginBottom: "30px",
          padding: "20px",
          borderRadius: "24px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          width: "100%",
        }}
      >
        <div style={{ marginBottom: "15px", opacity: 0.7, fontSize: "12px" }}>
          ✨ Suggestions for: {block.occasion}
        </div>

        {/* TOP LOOKS / COMBOS - Only show if we have multiple outfit categories */}
        {block.data?.top_combos && block.data.top_combos.length > 0 && (
          <div>
            <h2 style={{ marginBottom: "20px", fontSize: "28px" }}>🔥 Best Complete Looks</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                gap: "20px",
                width: "100%",
              }}
            >
              {block.data.top_combos.slice(0, 3).map((combo, comboIndex) => (
                <div
                  key={comboIndex}
                  style={{
                    width: "100%",
                    maxWidth: "350px",
                    padding: "18px",
                    borderRadius: "24px",
                    background: "linear-gradient(135deg,rgba(96,165,250,0.1),rgba(192,132,252,0.1))",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <h3>Complete Look {comboIndex + 1}</h3>
                  <h2 style={{ color: "#c084fc", marginTop: "10px" }}>{formatPrice(combo.total_price)}</h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "12px",
                      marginTop: "16px",
                    }}
                  >
                    {combo.items?.map((item, idx) => (
                      <div key={idx} style={{ width: "100%" }}>
                        {renderProductCard(item, idx, true)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INDIVIDUAL PRODUCTS BY CATEGORY */}
        {block.data?.products && Object.keys(block.data.products).length > 0 && (
          <div>
            {Object.keys(block.data.products).map((category) => {
              const products = block.data.products[category];
              if (!products || products.length === 0) return null;
              
              // Format category name to be more readable
              const categoryName = category
                .replace(/_/g, " ")
                .replace(/(men|women)/g, "")
                .trim()
                .toUpperCase();
              
              return (
                <div key={category} style={{ marginTop: "40px" }}>
                  <h2
                    style={{
                      marginBottom: "18px",
                      fontSize: "24px",
                      textTransform: "capitalize",
                      color: "#f472b6"
                    }}
                  >
                     {categoryName} ({products.length} items)
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      gap: "18px",
                      overflowX: "auto",
                      scrollbarWidth: "none",
                      msOverflowStyle: "none",
                      paddingBottom: "10px",
                    }}
                  >
                    {products.map((item, index) => renderProductCard(item, index, false))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* If no products or combos found */}
        {(!block.data?.top_combos || block.data.top_combos.length === 0) && 
         (!block.data?.products || Object.keys(block.data.products).length === 0) && (
          <div style={{ textAlign: "center", padding: "40px", opacity: 0.7 }}>
            😅 No products found matching your criteria for {block.outfits?.join(", ")}. 
            Try different outfits or increase your budget!
          </div>
        )}
        
        {/* Summary section */}
        {block.data?.summary && (
          <div style={{ 
            marginTop: "30px", 
            padding: "15px", 
            borderRadius: "12px", 
            background: "rgba(255,255,255,0.05)",
            fontSize: "13px",
            opacity: 0.7
          }}>
            <div>📊 Summary: {block.data.summary.total_categories} categories • {block.data.summary.total_products} products • {block.data.summary.total_combos} complete looks</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        height: "100vh",
        background: "radial-gradient(circle at top,#0f1b3d,#020617,#01030a)",
        color: "white",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          height: "72px",
          padding: "0 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <h1
          style={{
            fontSize: "26px",
            fontWeight: "800",
            background: "linear-gradient(to right,#60a5fa,#c084fc,#f472b6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Fashion AI Pro
        </h1>

        <button
          onClick={() => setShowHistory(true)}
          style={{
            border: "none",
            padding: "10px 18px",
            borderRadius: "16px",
            background: "linear-gradient(135deg,#ec4899,#8b5cf6)",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
          }}
        >
          <FaHistory />
          History
        </button>
      </div>

      {/* HISTORY MODAL */}
      {showHistory && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(10px)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => setShowHistory(false)}
        >
          <div
            style={{
              width: "90%",
              maxWidth: "800px",
              maxHeight: "80vh",
              background: "linear-gradient(135deg,#0f1b3d,#020617)",
              borderRadius: "24px",
              border: "1px solid rgba(255,255,255,0.1)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "24px",
                background: "rgba(255,255,255,0.03)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <h2 style={{ fontSize: "28px", fontWeight: "700", background: "linear-gradient(to right,#60a5fa,#c084fc,#f472b6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Search History
              </h2>
              <p style={{ opacity: 0.6, marginTop: "8px", fontSize: "14px" }}>Your previous outfit suggestions</p>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "24px",
                scrollbarWidth: "thin",
              }}
            >
              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>
                  <p>No history yet. Start a conversation to see your searches here!</p>
                </div>
              ) : (
                history.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      marginBottom: index === history.length - 1 ? "0" : "20px",
                      padding: "20px",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                        fontSize: "12px",
                        opacity: 0.6,
                      }}
                    >
                      <span>📅 {item.date || "N/A"}</span>
                      <span>⏰ {item.time || "N/A"}</span>
                    </div>

                    <div style={{ marginBottom: "16px" }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                          gap: "10px",
                          marginBottom: "12px",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "11px", opacity: 0.5, marginBottom: "4px" }}>Gender</div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#c084fc" }}>
                            {item.userSelections?.gender || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", opacity: 0.5, marginBottom: "4px" }}>Age</div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#c084fc" }}>
                            {item.userSelections?.age || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", opacity: 0.5, marginBottom: "4px" }}>Occasion</div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#c084fc" }}>
                            {item.userSelections?.occasion || item.occasion || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", opacity: 0.5, marginBottom: "4px" }}>Outfit(s)</div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#c084fc" }}>
                            {item.userSelections?.outfit || "N/A"}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: "11px", opacity: 0.5, marginBottom: "4px" }}>Budget</div>
                          <div style={{ fontSize: "14px", fontWeight: "500", color: "#c084fc" }}>
                            {item.userSelections?.budget ? formatPrice(item.userSelections.budget) : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {item.data?.top_combos && item.data.top_combos.length > 0 && (
                      <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", marginBottom: "10px", color: "#f472b6" }}>
                          ✨ Suggestions Found:
                        </div>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                          {item.data.top_combos.slice(0, 3).map((combo, idx) => (
                            <div
                              key={idx}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "20px",
                                background: "rgba(192,132,252,0.2)",
                                fontSize: "12px",
                              }}
                            >
                              {formatPrice(combo.total_price)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div
              style={{
                padding: "20px",
                background: "rgba(255,255,255,0.03)",
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  padding: "10px 24px",
                  borderRadius: "40px",
                  border: "none",
                  background: "linear-gradient(135deg,#ec4899,#8b5cf6)",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                <IoClose size={18} />
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTRO */}
      {introVisible && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            textAlign: "center",
            zIndex: 100,
          }}
        >
          <img src={cat} alt="" style={{ width: "300px" }} />
          <h1
            style={{
              marginTop: "20px",
              fontSize: "58px",
              lineHeight: "1.1",
              fontWeight: "800",
              background: "linear-gradient(to right,#60a5fa,#c084fc,#f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Hi! I'm your
            <br />
            Fashion Advisor ✨
          </h1>
        </div>
      )}

      {/* CHAT AREA */}
      <div
        ref={chatRef}
        style={{
          flex: 1,
          overflowY: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          padding: "24px",
        }}
      >
        {messages.map((msg) => {
          if (msg.type === "results") {
            return renderResultsMessage(msg);
          }

          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "-10px",
                  maxWidth: "80%",
                }}
              >
                {msg.sender === "bot" && <img src={cat} alt="" style={{ width: "200px" }} />}

                <div
                  style={{
                    padding: "14px 20px",
                    borderRadius: "22px",
                    lineHeight: "1.6",
                    background:
                      msg.sender === "user"
                        ? "linear-gradient(135deg,#c084fc,#ec4899)"
                        : "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(20px)",
                    textAlign: "left",
                  }}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <img src={cat} alt="" width="45" />
            <div style={{ padding: "14px 22px", borderRadius: "20px", background: "rgba(255,255,255,0.08)" }}>
              Finding best looks...
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div
        style={{
          padding: "18px 24px",
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            background: "rgba(255,255,255,0.08)",
            borderRadius: "40px",
            padding: "6px 6px 6px 20px",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend();
              }
            }}
            placeholder="Ask your fashion advisor..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "white",
              fontSize: "15px",
              padding: "14px 0",
            }}
          />

          <button
            onClick={handleSend}
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              border: "none",
              background: "linear-gradient(135deg,#ec4899,#8b5cf6)",
              color: "white",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "20px",
            }}
          >
            <IoPaperPlaneSharp />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
