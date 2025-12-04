export default function UnavailablePage() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">Content Unavailable</h1>
        <p className="text-lg text-muted-foreground">This content is not available for you.</p>
      </div>
    </div>
  );
}
