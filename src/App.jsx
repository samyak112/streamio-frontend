import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

function App() {
  const StreamComponent = React.lazy(() => import("./components/Stream"));
  const WatchComponent = React.lazy(() => import("./components/Watch"));
  const HomeComponent = React.lazy(() => import("./components/Home"));
  return (
    <div style={{height:'100vh',width:'100vw'}}>

    <Router>
    <Routes>
    <Route
        path="/"
        element={
          <React.Suspense fallback={'Loading..'}>
              <HomeComponent />
          </React.Suspense>
        }
        />
      <Route
        path="/stream"
        element={
          <React.Suspense fallback={'Loading..'}>
              <StreamComponent />
          </React.Suspense>
        }
        />
      <Route
        path="/watch"
        element={
          <React.Suspense fallback={'Loading..'}>
            <WatchComponent />
          </React.Suspense>
        }
        />
      </Routes>
  </Router>
        </div>
  )
}

export default App
