
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        // Check if the user is an administrator
        const {
            data: { user },
        } = await supabaseClient.auth.getUser()

        if (!user) throw new Error('Not authenticated')

        // Create Service Role Client for Admin actions
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // Verify Role
        const { data: userRoles, error: rolesError } = await supabaseAdmin
            .from('user_roles')
            .select('roles(name)')
            .eq('user_id', user.id)
            .single();

        const roleName = userRoles?.roles?.name;

        if (roleName !== 'administrator') {
            throw new Error('Unauthorized: Admin access required');
        }

        const { action, userId, payload } = await req.json()

        if (action === 'list_users') {
            const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
            if (error) throw error

            console.log(`Found ${users.length} users in Auth`);
            console.log('User IDs:', users.map(u => u.id));


            // Fetch roles for all users
            const { data: userRoles, error: rolesError } = await supabaseAdmin
                .from('user_roles')
                .select('user_id, roles(name, id)')

            if (rolesError) console.error('Roles Error:', rolesError);
            console.log(`Fetched ${userRoles?.length ?? 0} role assignments`);

            // Fetch profiles
            const { data: profiles, error: profilesError } = await supabaseAdmin
                .from('profiles')
                .select('*')

            if (profilesError) console.error('Profiles Error:', profilesError);
            console.log(`Fetched ${profiles?.length ?? 0} profiles`);

            console.log('Sample User Role:', JSON.stringify(userRoles?.[0] || {}));


            // Merge data
            const mergedUsers = users.map(u => {
                const roleIdx = userRoles?.find(ur => ur.user_id === u.id)
                const profile = profiles?.find(p => p.id === u.id)
                return {
                    id: u.id,
                    email: u.email,
                    last_sign_in_at: u.last_sign_in_at,
                    created_at: u.created_at,
                    role: (roleIdx?.roles as any)?.name || 'user',
                    role_id: (roleIdx?.roles as any)?.id,
                    full_name: profile?.full_name || ''
                }
            })

            return new Response(JSON.stringify({ users: mergedUsers }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'update_user') {
            const { error } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                payload
            )
            if (error) throw error

            // Update role if provided
            if (payload.role) {
                const { data: roleData } = await supabaseAdmin
                    .from('roles')
                    .select('id')
                    .eq('name', payload.role)
                    .single()

                if (roleData) {
                    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
                    await supabaseAdmin.from('user_roles').insert({ user_id: userId, role_id: roleData.id })
                }
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'create_user') {
            const { data, error } = await supabaseAdmin.auth.admin.createUser(payload)
            if (error) throw error

            // Assign role if provided
            if (payload.role) {
                const { data: roleData } = await supabaseAdmin
                    .from('roles')
                    .select('id')
                    .eq('name', payload.role)
                    .single()

                if (roleData) {
                    await supabaseAdmin.from('user_roles').insert({ user_id: data.user.id, role_id: roleData.id })
                }
            }

            return new Response(JSON.stringify({ success: true, user: data.user }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        if (action === 'delete_user') {
            const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
            if (error) throw error
            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        throw new Error('Invalid action')

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
