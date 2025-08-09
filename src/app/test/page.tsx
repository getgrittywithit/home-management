export default function TestPage() {
  return (
    <div className="min-h-screen bg-red-500 p-8">
      <div className="bg-blue-500 text-white p-4 rounded-lg">
        <h1 className="text-4xl font-bold">Tailwind Test</h1>
        <p className="text-xl mt-4">If you can see colors and styling, Tailwind is working!</p>
        <div className="mt-4 flex space-x-4">
          <div className="w-16 h-16 bg-green-500 rounded"></div>
          <div className="w-16 h-16 bg-yellow-500 rounded"></div>
          <div className="w-16 h-16 bg-purple-500 rounded"></div>
        </div>
        <div className="mt-4 p-4 bg-white text-black rounded">
          <p>This should be a white box with black text</p>
        </div>
      </div>
    </div>
  )
}