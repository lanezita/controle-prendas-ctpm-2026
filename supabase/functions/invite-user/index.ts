import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Cabecalho de autorizacao ausente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Inicializa o cliente com o token do chamador para validar identidade
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Obtem dados do usuario que realizou a chamada
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token de usuario invalido ou expirado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Consulta a tabela de perfis de usuarios para assegurar perfil de admin do chamador
    const { data: callerProfile, error: callerProfileError } = await supabaseClient
      .from("usuarios_perfis")
      .select("perfil")
      .eq("id", user.id)
      .single();

    if (callerProfileError || !callerProfile || callerProfile.perfil !== "admin") {
      return new Response(JSON.stringify({ error: "Acesso negado: apenas administradores podem enviar convites de operacao." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Leitura dos dados do convite enviado pelo frontend
    const { email, nome, perfil, turno, status } = await req.json();

    if (!email || !nome || !perfil || !turno || !status) {
      return new Response(JSON.stringify({ error: "Campos obrigatorios ausentes (email, nome, perfil, turno, status)." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regras de validacao no Backend para Perfil e Turno
    const allowedPerfis = ["admin", "manha", "tarde", "consulta"];
    const allowedTurnos = ["manha", "tarde", "ambos"];
    const allowedStatus = ["ativo", "inativo"];

    if (!allowedPerfis.includes(perfil)) {
      return new Response(JSON.stringify({ error: `Perfil invalido: ${perfil}. Perfis aceitos: admin, manha, tarde, consulta.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowedTurnos.includes(turno)) {
      return new Response(JSON.stringify({ error: `Turno invalido: ${turno}. Turnos aceitos: manha, tarde, ambos.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allowedStatus.includes(status)) {
      return new Response(JSON.stringify({ error: `Status invalido: ${status}. Status aceitos: ativo, inativo.` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validacao logica de dependenca de Turno e Perfil
    if (perfil === "admin" && turno !== "ambos") {
      return new Response(JSON.stringify({ error: "O perfil de Administrador exige o turno definido como 'ambos'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (perfil === "manha" && turno !== "manha") {
      return new Response(JSON.stringify({ error: "O perfil de Operador Manha exige o turno definido como 'manha'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (perfil === "tarde" && turno !== "tarde") {
      return new Response(JSON.stringify({ error: "O perfil de Operador Tarde exige o turno definido como 'tarde'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validacao de formato de e-mail no backend
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return new Response(JSON.stringify({ error: "Formato de e-mail invalido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Inicializa o cliente administrador (segura pelo service_role)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 3. Impede cadastros duplicados na tabela usuarios_perfis
    const { data: existingProfile, error: existingProfileError } = await supabaseAdmin
      .from("usuarios_perfis")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "Ja existe um operador cadastrado com este e-mail no sistema." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Envia o convite oficial via Supabase Auth Admin
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { nome }
    });

    if (inviteError || !inviteData?.user) {
      return new Response(JSON.stringify({ error: `Erro ao convidar usuario no Supabase Auth: ${inviteError?.message || "erro desconhecido"}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const invitedUser = inviteData.user;

    // 5. Cria o registro correspondente do perfil na tabela usuarios_perfis vinculando com o id gerado
    const { error: insertError } = await supabaseAdmin
      .from("usuarios_perfis")
      .insert([
        {
          id: invitedUser.id,
          nome,
          email,
          perfil,
          turno,
          status,
          pode_cadastrar_prendas: perfil === "admin",
          pode_cadastrar_campanhas: perfil === "admin",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);

    if (insertError) {
      return new Response(JSON.stringify({ error: `Usuario convidado com sucesso, porem a criacao do perfil falhou: ${insertError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: invitedUser.id,
          nome,
          email,
          perfil,
          turno,
          status
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
