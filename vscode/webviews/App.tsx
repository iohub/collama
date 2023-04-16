import { useCallback, useEffect, useState } from 'react'

import './App.css'

import { ChatHistory, ChatMessage } from '@sourcegraph/cody-shared/src/chat/transcript/messages'

import { About } from './About'
import { Chat } from './Chat'
import { Debug } from './Debug'
import { Header } from './Header'
import { LoadingPage } from './LoadingPage'
import { Login } from './Login'
import { NavBar, View } from './NavBar'
import { Recipes } from './Recipes'
import { Settings } from './Settings'
import { UserHistory } from './UserHistory'
import { vscodeAPI } from './utils/VSCodeApi'

export function App(): React.ReactElement {
    const [devMode, setDevMode] = useState(false)
    const [debugLog, setDebugLog] = useState(['No data yet'])
    const [view, setView] = useState<View | undefined>()
    const [messageInProgress, setMessageInProgress] = useState<ChatMessage | null>(null)
    const [transcript, setTranscript] = useState<ChatMessage[]>([])
    const [isValidLogin, setIsValidLogin] = useState<boolean>()
    const [formInput, setFormInput] = useState('')
    const [inputHistory, setInputHistory] = useState<string[] | []>([])
    const [userHistory, setUserHistory] = useState<ChatHistory | null>(null)

    useEffect(() => {
        vscodeAPI.onMessage(message => {
            switch (message.type) {
                case 'transcript': {
                    if (message.isMessageInProgress) {
                        const msgLength = message.messages.length - 1
                        setTranscript(message.messages.slice(0, msgLength))
                        setMessageInProgress(message.messages[msgLength])
                    } else {
                        setTranscript(message.messages)
                        setMessageInProgress(null)
                    }
                    break
                }
                case 'token':
                    {
                        // Get the token from the extension.
                        const hasToken = !!message.value
                        setView(hasToken ? 'chat' : 'login')
                        setDevMode(message.mode === 'development')
                    }
                    break
                case 'login':
                    setIsValidLogin(message.isValid)
                    setView(message.isValid ? 'chat' : 'login')
                    break
                case 'showTab':
                    if (message.tab === 'chat') {
                        setView('chat')
                    }
                    break
                case 'debug':
                    setDebugLog([...debugLog, message.message])
                    break
                case 'history':
                    setInputHistory(message.messages?.input ?? [])
                    setUserHistory(message.messages?.chat ?? null)
                    break
            }
        })

        vscodeAPI.postMessage({ command: 'initialized' })
        // The dependencies array is empty to execute the callback only on component mount.
    }, [debugLog])

    const onLogin = useCallback((token: string, endpoint: string) => {
        if (!token || !endpoint) {
            return
        }
        setIsValidLogin(undefined)
        vscodeAPI.postMessage({ command: 'settings', serverEndpoint: endpoint, accessToken: token })
    }, [])

    const onLogout = useCallback(() => {
        vscodeAPI.postMessage({ command: 'removeToken' })
        setView('login')
    }, [setView])

    const onResetClick = useCallback(() => {
        setView('chat')
        setDebugLog([])
        setFormInput('')
        setMessageInProgress(null)
        setTranscript([])
        vscodeAPI.postMessage({ command: 'reset' })
    }, [setView, setMessageInProgress, setTranscript, setDebugLog])

    if (!view) {
        return <LoadingPage />
    }

    return (
        <div className="outer-container">
            <Header showResetButton={view && view !== 'login'} onResetClick={onResetClick} />
            {view === 'login' && <Login onLogin={onLogin} isValidLogin={isValidLogin} />}
            {view && view !== 'login' && <NavBar view={view} setView={setView} devMode={devMode} />}
            {view === 'about' && <About />}
            {view === 'debug' && devMode && <Debug debugLog={debugLog} />}
            {view === 'history' && (
                <UserHistory
                    userHistory={userHistory}
                    setUserHistory={setUserHistory}
                    setInputHistory={setInputHistory}
                />
            )}
            {view === 'recipes' && <Recipes />}
            {view === 'settings' && <Settings setView={setView} onLogout={onLogout} />}
            {view === 'chat' && (
                <Chat
                    messageInProgress={messageInProgress}
                    transcript={transcript}
                    formInput={formInput}
                    setFormInput={setFormInput}
                    inputHistory={inputHistory}
                    setInputHistory={setInputHistory}
                />
            )}
        </div>
    )
}