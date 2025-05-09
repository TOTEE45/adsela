"use client";
import React from "react";

import { useHandleStreamResponse } from "../utilities/runtime-helpers";

function MainComponent() {
  const [mainKeyword, setMainKeyword] = React.useState("");
  const [targetCountry, setTargetCountry] = React.useState("");
  const [articleLength, setArticleLength] = React.useState("1500");
  const [keywords, setKeywords] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [keywordsLoading, setKeywordsLoading] = React.useState(false);
  const [result, setResult] = React.useState({
    article: "",
    headerImage: "",
    footerImage: "",
  });
  const [error, setError] = React.useState(null);
  const [streamingMessage, setStreamingMessage] = React.useState("");

  const handleStreamResponse = useHandleStreamResponse({
    onChunk: setStreamingMessage,
    onFinish: (message) => {
      setResult((prev) => ({ ...prev, article: message }));
      setStreamingMessage("");
    },
  });

  const generateKeywords = React.useCallback(async () => {
    if (!mainKeyword.trim()) {
      setError("يرجى إدخال الكلمة المفتاحية الرئيسية");
      return;
    }

    setKeywordsLoading(true);
    setError(null);

    try {
      const response = await fetch("/integrations/chat-gpt/conversationgpt4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content:
                "أنت خبير في تحسين محركات البحث (SEO). مهمتك توليد كلمات مفتاحية ذات صلة.",
            },
            {
              role: "user",
              content: `قم بتوليد 20 كلمة مفتاحية ذات صلة بـ "${mainKeyword}"${
                targetCountry ? ` في ${targetCountry}` : ""
              }. قم بإرجاع الكلمات المفتاحية فقط، كل كلمة في سطر جديد.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("فشل في توليد الكلمات المفتاحية");
      }

      const data = await response.json();
      const keywordsList = data.choices[0].message.content
        .split("\n")
        .filter((k) => k.trim());
      setKeywords(keywordsList);
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء توليد الكلمات المفتاحية");
    } finally {
      setKeywordsLoading(false);
    }
  }, [mainKeyword, targetCountry]);

  const generateArticle = React.useCallback(async () => {
    if (!mainKeyword.trim()) {
      setError("يرجى إدخال الكلمة المفتاحية الرئيسية");
      return;
    }

    setLoading(true);
    setError(null);
    setResult({ article: "", headerImage: "", footerImage: "" });

    try {
      const articleResponse = await fetch(
        "/integrations/chat-gpt/conversationgpt4",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [
              {
                role: "system",
                content: `أنت كاتب محترف باللغة العربية. مهمتك كتابة مقال شامل ومفيد مع مراعاة تحسين محركات البحث (SEO).
                يجب أن يكون طول المقال تقريباً ${articleLength} كلمة.

                يجب أن يتبع المقال الهيكل التالي:
                1. مقدمة موجزة عن الموضوع
                2. المحتوى الرئيسي مقسم إلى عدة أقسام
                3. خاتمة تلخص النقاط الرئيسية

                ملاحظات مهمة:
                - قم بكتابة المقال كنص عادي
                - استخدم علامة # للعناوين الرئيسية
                - استخدم علامة ## للعناوين الفرعية
                - استخدم - للقوائم غير المرقمة
                - استخدم 1. 2. 3. للقوائم المرقمة
                - استخدم > للاقتباسات

                لا تستخدم أي وسوم HTML في النص.`,
              },
              {
                role: "user",
                content: `اكتب مقالاً عن: ${mainKeyword}${
                  targetCountry ? ` في ${targetCountry}` : ""
                }\n${
                  keywords.length
                    ? `استخدم الكلمات المفتاحية التالية في المقال:\n${keywords.join(
                        "\n"
                      )}`
                    : ""
                }`,
              },
            ],
            stream: true,
          }),
        }
      );

      handleStreamResponse(articleResponse);

      const headerImageResponse = await fetch(
        `/integrations/dall-e-3/?prompt=${encodeURIComponent(
          mainKeyword +
            (targetCountry ? ` في ${targetCountry}` : "") +
            " - صورة رئيسية تعبيرية"
        )}`
      );
      if (!headerImageResponse.ok) {
        throw new Error("فشل في توليد الصورة الرئيسية");
      }
      const headerImageData = await headerImageResponse.json();

      const footerImageResponse = await fetch(
        `/integrations/dall-e-3/?prompt=${encodeURIComponent(
          mainKeyword +
            (targetCountry ? ` في ${targetCountry}` : "") +
            " - صورة ختامية ملخصة"
        )}`
      );
      if (!footerImageResponse.ok) {
        throw new Error("فشل في توليد الصورة الختامية");
      }
      const footerImageData = await footerImageResponse.json();

      setResult((prev) => ({
        ...prev,
        headerImage: headerImageData.data[0],
        footerImage: footerImageData.data[0],
      }));
    } catch (err) {
      console.error(err);
      setError("حدث خطأ أثناء توليد المقال أو الصور");
    } finally {
      setLoading(false);
    }
  }, [
    mainKeyword,
    targetCountry,
    keywords,
    handleStreamResponse,
    articleLength,
  ]);

  const renderFormattedText = (text) => {
    if (!text) return null;

    return text.split("\n").map((line, index) => {
      if (line.startsWith("# ")) {
        return (
          <h2 key={index} style={{ fontSize: "24px", margin: "20px 0 10px" }}>
            {line.slice(2)}
          </h2>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h3 key={index} style={{ fontSize: "20px", margin: "15px 0 10px" }}>
            {line.slice(3)}
          </h3>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={index}
            style={{
              borderRight: "4px solid #9C27B0",
              margin: "10px 0",
              padding: "10px 20px",
              backgroundColor: "#f5f5f5",
            }}
          >
            {line.slice(2)}
          </blockquote>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={index} style={{ marginRight: "20px", marginBottom: "5px" }}>
            {line.slice(2)}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={index} style={{ marginRight: "20px", marginBottom: "5px" }}>
            {line.slice(line.indexOf(" ") + 1)}
          </li>
        );
      }
      if (line.trim() === "") {
        return <br key={index} />;
      }
      return (
        <p key={index} style={{ marginBottom: "10px", lineHeight: "1.6" }}>
          {line}
        </p>
      );
    });
  };

  const convertToHtml = (text) => {
    if (!text) return "";

    let html = "";

    if (result.headerImage) {
      html += `<img src="${result.headerImage}" alt="${mainKeyword} - صورة رئيسية" style="width: 100%; max-width: 800px; border-radius: 10px; margin-bottom: 20px;">\n\n`;
    }

    html += text
      .split("\n")
      .map((line) => {
        if (line.startsWith("# ")) {
          return `<h2 style="font-size: 24px; margin: 20px 0 10px;">${line.slice(
            2
          )}</h2>`;
        }
        if (line.startsWith("## ")) {
          return `<h3 style="font-size: 20px; margin: 15px 0 10px;">${line.slice(
            3
          )}</h3>`;
        }
        if (line.startsWith("> ")) {
          return `<blockquote style="border-right: 4px solid #9C27B0; margin: 10px 0; padding: 10px 20px; background-color: #f5f5f5;">${line.slice(
            2
          )}</blockquote>`;
        }
        if (line.startsWith("- ")) {
          return `<li style="margin-right: 20px; margin-bottom: 5px;">${line.slice(
            2
          )}</li>`;
        }
        if (/^\d+\.\s/.test(line)) {
          return `<li style="margin-right: 20px; margin-bottom: 5px;">${line.slice(
            line.indexOf(" ") + 1
          )}</li>`;
        }
        if (line.trim() === "") {
          return "<br>";
        }
        return `<p style="margin-bottom: 10px; line-height: 1.6;">${line}</p>`;
      })
      .join("\n");

    if (result.footerImage) {
      html += `\n\n<img src="${result.footerImage}" alt="${mainKeyword} - صورة ختامية" style="width: 100%; max-width: 800px; border-radius: 10px; margin-top: 20px;">`;
    }

    return html;
  };

  const copyPlainText = async () => {
    try {
      await navigator.clipboard.writeText(result.article);
      alert("تم نسخ النص بنجاح!");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء نسخ النص");
    }
  };

  const copyHtml = async () => {
    try {
      const htmlContent = convertToHtml(result.article);
      await navigator.clipboard.writeText(htmlContent);
      alert("تم نسخ كود HTML بنجاح!");
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء نسخ كود HTML");
    }
  };

  return (
    <div
      style={{
        direction: "rtl",
        fontFamily: "'Cairo', sans-serif",
        padding: "20px",
        maxWidth: "800px",
        margin: "auto",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
        مولد المقالات الذكي
      </h2>

      <div style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "15px" }}>
          <input
            type="text"
            value={mainKeyword}
            onChange={(e) => setMainKeyword(e.target.value)}
            placeholder="أدخل الكلمة المفتاحية الرئيسية"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              marginBottom: "10px",
            }}
          />
          <input
            type="text"
            value={targetCountry}
            onChange={(e) => setTargetCountry(e.target.value)}
            placeholder="البلد المستهدف (اختياري)"
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              marginBottom: "10px",
            }}
          />
          <select
            value={articleLength}
            onChange={(e) => setArticleLength(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
            }}
          >
            <option value="500">مقال قصير (500 كلمة)</option>
            <option value="1500">مقال متوسط (1500 كلمة)</option>
            <option value="2500">مقال طويل (2500 كلمة)</option>
            <option value="5000">مقال مفصل (5000 كلمة)</option>
            <option value="7000">مقال شامل (7000 كلمة)</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button
            onClick={generateKeywords}
            disabled={keywordsLoading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#9C27B0",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: keywordsLoading ? "not-allowed" : "pointer",
              flex: 1,
            }}
          >
            {keywordsLoading
              ? "⏳ جاري توليد الكلمات..."
              : "توليد كلمات مفتاحية"}
          </button>
          <button
            onClick={generateArticle}
            disabled={loading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: loading ? "not-allowed" : "pointer",
              flex: 1,
            }}
          >
            {loading ? "⏳ جاري التوليد..." : "إنشاء المقال"}
          </button>
        </div>

        {keywords.length > 0 && (
          <div
            style={{
              backgroundColor: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              marginBottom: "15px",
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", fontSize: "16px" }}>
              الكلمات المفتاحية المقترحة:
            </h3>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: "#e0e0e0",
                    padding: "5px 10px",
                    borderRadius: "15px",
                    fontSize: "14px",
                  }}
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{ color: "red", marginBottom: "20px", textAlign: "center" }}
        >
          {error}
        </div>
      )}

      {(result.article ||
        result.headerImage ||
        result.footerImage ||
        streamingMessage) && (
        <div
          style={{
            border: "1px solid #ccc",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          {result.headerImage && (
            <img
              src={result.headerImage}
              alt={`${mainKeyword} - صورة رئيسية`}
              style={{
                width: "100%",
                borderRadius: "10px",
                marginBottom: "20px",
              }}
            />
          )}

          {(result.article || streamingMessage) && (
            <div
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "15px",
                justifyContent: "flex-start",
              }}
            >
              <button
                onClick={copyPlainText}
                style={{
                  padding: "8px 15px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                نسخ النص
              </button>
              <button
                onClick={copyHtml}
                style={{
                  padding: "8px 15px",
                  backgroundColor: "#FF9800",
                  color: "white",
                  border: "none",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                HTML نسخ
              </button>
            </div>
          )}

          <div style={{ lineHeight: "1.6" }}>
            {renderFormattedText(streamingMessage || result.article)}
          </div>
          {result.footerImage && (
            <img
              src={result.footerImage}
              alt={`${mainKeyword} - صورة ختامية`}
              style={{
                width: "100%",
                borderRadius: "10px",
                marginTop: "20px",
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default MainComponent;