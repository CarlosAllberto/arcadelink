-- rls_auto_enable() é SECURITY DEFINER e só serve ao event trigger ensure_rls,
-- que liga RLS em toda tabela nova do schema public. Ninguém precisa chamá-la pela API,
-- e o event trigger dispara sem checar EXECUTE, então tirar o acesso não muda nada nele.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
