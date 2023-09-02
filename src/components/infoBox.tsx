import '../../app/globals.css';

interface Props {
  title: string;
  children: React.ReactNode;
}

export default function InfoBox({ title, children }: Props) {
  return (
    <div className="p-4 bg-gray-200 border-b-[0.2rem] border-r-[0.2rem] border-gray-300 flex flex-col gap-2">
      <div className="flex flex-row gap-4 items-center">
        <span className="grow h-0.5 bg-gray-400" />
        <h5>{title}</h5>
        <span className="grow h-0.5 bg-gray-400" />
      </div>
      {children}
    </div>
  );
}
