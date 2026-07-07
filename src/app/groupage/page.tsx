import GroupageView from "@/components/views/GroupageView";
import { getConsolidationPools } from "@/lib/supabase/queries";

export default async function GroupagePage() {
  const pools = await getConsolidationPools({ status: "open" });

  return <GroupageView pools={pools} />;
}
