import ReactDOM from 'react-dom/client'
import './assets/index.css'
import App from './App'
import CssBaseline from '@mui/material/CssBaseline'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { createTheme, StyledEngineProvider, ThemeProvider } from '@mui/material/styles'

const root = document.getElementById('root') as HTMLElement

const theme = createTheme({
  components: {
    MuiPopover: {
      defaultProps: {
        container: root
      }
    },
    MuiPopper: {
      defaultProps: {
        container: root
      }
    }
  }
})

ReactDOM.createRoot(root).render(
  <>
    <CssBaseline />
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <HashRouter>
          <Routes>
            <Route path="/" element={<App />} />
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </StyledEngineProvider>
  </>
)
