import { MapPin } from "lucide-react";
import { AddressManager } from "@/components/profile/AddressManager";

export default function ProfileAddressesPage() {
  return <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"><section className="mb-7 rounded-[36px] border border-line bg-white p-6 shadow-soft sm:p-8"><span className="inline-flex min-h-10 items-center gap-2 rounded-pill bg-blue/10 px-4 text-xs font-black text-blue"><MapPin size={16} />Private delivery</span><h1 className="mt-5 font-display text-4xl font-black sm:text-6xl">收货地址</h1><p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-muted">地址仅用于实体商品结算，并会以订单快照保存，避免后续修改影响历史订单。</p></section><AddressManager /></div>;
}
