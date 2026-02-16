import { redirect } from 'next/navigation'

export default function FeedEditorRedirectPage() {
  // В текущей версии функционал перенесён в основной интерфейс
  redirect('/account?tab=tools')
}
