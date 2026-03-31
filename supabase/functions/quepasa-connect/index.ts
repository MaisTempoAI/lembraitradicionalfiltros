import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateToken(length = 10): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    result += chars[b % chars.length];
  }
  return result;
}

// Helper to convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = generateToken();
    console.log("Generated token:", token, "for userId:", userId);

    // Save token to lembrai_usuarios
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("lembrai_usuarios")
      .update({ quepasakey: token })
      .eq("id", userId);

    if (updateError) {
      console.error("Error updating quepasakey:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save token" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Token saved, calling Quepasa API...");

    // Call Quepasa API to get QR code
    const scanResponse = await fetch(
      "https://quepasa-stack-quepasa.pkgaq6.easypanel.host/scan",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-QUEPASA-USER": "access@maistempoai.com.br",
          "X-QUEPASA-TOKEN": token,
        },
      }
    );

    console.log("Quepasa response status:", scanResponse.status);
    console.log("Quepasa content-type:", scanResponse.headers.get("content-type"));

    if (!scanResponse.ok) {
      const errorText = await scanResponse.text();
      console.error("Quepasa API error:", scanResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to get QR code from Quepasa", details: errorText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const contentType = scanResponse.headers.get("content-type") || "";

    // Handle image response (PNG/JPEG) - convert to base64 data URL
    if (contentType.startsWith("image/")) {
      console.log("Quepasa returned image, converting to base64...");
      const arrayBuffer = await scanResponse.arrayBuffer();
      const base64 = arrayBufferToBase64(arrayBuffer);
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      return new Response(JSON.stringify({ qrcode: dataUrl }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle JSON response
    if (contentType.includes("application/json")) {
      const scanData = await scanResponse.json();
      console.log("Quepasa JSON response keys:", Object.keys(scanData));
      const qrcode = scanData.qrcode || scanData.data?.qrcode || scanData.image || scanData.data?.image || null;

      return new Response(JSON.stringify({ qrcode, raw: scanData }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try as binary image
    console.log("Unknown content-type, trying as binary image...");
    const arrayBuffer = await scanResponse.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const dataUrl = `data:image/png;base64,${base64}`;

    return new Response(JSON.stringify({ qrcode: dataUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
