"use client"

import { useState, useEffect, useRef } from "react"
import { RetellWebClient } from "retell-client-js-sdk"
import {
  AppBar,
  Toolbar,
  Button,
  Box,
  Container,
  IconButton,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  ThemeProvider,
  createTheme,
  useScrollTrigger,
  Link,
  keyframes,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from "@mui/material"
import {
  WbSunny as WbSunnyIcon,
  Language as LanguageIcon,
  Facebook,
  Instagram,
  Twitter,
  LinkedIn,
  Chat as ChatIcon,
  Menu as MenuIcon,
  Call as CallIcon,
  CallEnd as CallEndIcon,
} from "@mui/icons-material"

interface RegisterCallResponse {
  access_token?: string
  callId?: string
  sampleRate: number
}

interface UserDetails {
  name: string
  dob: string
  email: string
  shippingAddress: string
}

const webClient = new RetellWebClient()

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#1e3a8a", // Deep blue
      light: "#3b82f6",
      dark: "#1e40af",
    },
    secondary: {
      main: "#0f766e", // Teal
      light: "#14b8a6",
      dark: "#0f5964",
    },
    error: {
      main: "#b91c1c", // Dark red
      light: "#ef4444",
      dark: "#7f1d1d",
    },
  },
})

export default function GaiBeach() {
  const [callStatus, setCallStatus] = useState<"not-started" | "active" | "inactive">("not-started")
  const [callInProgress, setCallInProgress] = useState(false)
  const [userDetails, setUserDetails] = useState<UserDetails>({
    name: "",
    dob: "",
    email: "",
    shippingAddress: "",
  })
  const [transcript, setTranscript] = useState([])
  const chatContentRef = useRef(null)
  const trigger = useScrollTrigger({
    disableHysteresis: true,
    threshold: 100,
  })
  const [chatActive, setChatActive] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    webClient.on("conversationStarted", () => {
      console.log("Conversation started successfully")
      setCallStatus("active")
      setCallInProgress(false)
    })

    webClient.on("conversationEnded", ({ code, reason }) => {
      console.log("Conversation ended with code:", code, "reason:", reason)
      setCallStatus("inactive")
      setCallInProgress(false)
    })

    webClient.on("error", (error) => {
      console.error("An error occurred:", error)
      setCallStatus("inactive")
      setCallInProgress(false)
    })

    webClient.on("update", (update) => {
      if (update.transcript) {
        if (Array.isArray(update.transcript)) {
          setTranscript(update.transcript)
        } else if (typeof update.transcript === "object") {
          setTranscript([update.transcript])
        } else if (typeof update.transcript === "string") {
          const messages = update.transcript
            .split("\n")
            .filter((line) => line.trim() !== "")
            .map((line) => ({
              role: "assistant",
              content: line.trim(),
            }))
          setTranscript(messages)
        }
      }
    })

    return () => {
      webClient.off("conversationStarted")
      webClient.off("conversationEnded")
      webClient.off("error")
      webClient.off("update")
    }
  }, [])

  useEffect(() => {
    // Add Voiceflow chat widget
    const addChatbotScript = () => {
      const script = document.createElement("script")
      const projectId = "67900940c6f7a86d23b3de98"
      script.type = "text/javascript"
      script.innerHTML = `
                (function(d, t) {
                    var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
                    v.onload = function() {
                        window.voiceflow.chat.load({
                            verify: { projectID: '${projectId}' },
                            url: 'https://general-runtime.voiceflow.com',
                            versionID: 'production',
                            launch: {
                                event: {
                                    type: "launch",
                                    payload: {
                                        customer_name: "${userDetails.name}",
                                        email: "${userDetails.email}",
                                        DOB: "${userDetails.dob}",
                                        shippingAddress: "${userDetails.shippingAddress}"
                                    }
                                }
                            }
                        });
                    }
                    v.src = "https://cdn.voiceflow.com/widget/bundle.mjs"; v.type = "text/javascript"; s.parentNode.insertBefore(v, s);
                })(document, 'script');
            `
      document.body.appendChild(script)
      return script
    }

    const chatbotScript = addChatbotScript()

    return () => {
      if (chatbotScript && chatbotScript.parentNode) {
        chatbotScript.parentNode.removeChild(chatbotScript)
      }
    }
  }, [userDetails])

  const toggleConversation = async () => {
    if (callInProgress) return

    setCallInProgress(true)

    if (callStatus === "active") {
      try {
        await webClient.stopCall()
        setCallStatus("inactive")
      } catch (error) {
        console.error("Error stopping the call:", error)
      } finally {
        setCallInProgress(false)
      }
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
        await initiateConversation()
      } catch (error) {
        console.error("Microphone permission denied or error occurred:", error)
      } finally {
        setCallInProgress(false)
      }
    }
  }

  const initiateConversation = async () => {
    const agentId = "agent_ed7d97e9e136483cfdeb5a53ea"
    try {
      const registerCallResponse = await registerCall(agentId)
      if (registerCallResponse.callId) {
        await webClient.startCall({
          accessToken: registerCallResponse.access_token,
          callId: registerCallResponse.callId,
          sampleRate: registerCallResponse.sampleRate,
          enableUpdate: true,
        })
        setCallStatus("active")
      }
    } catch (error) {
      console.error("Error in registering or starting the call:", error)
    }
  }

  async function registerCall(agentId: string): Promise<RegisterCallResponse> {
    const apiKey = "53b76c26-bd21-4509-98d7-c5cc62f93b59"
    const sampleRate = 16000

    try {
      const response = await fetch("https://api.retellai.com/v2/create-web-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          agent_id: agentId,
          retell_llm_dynamic_variables: {
            member_name: userDetails.name,
            email: userDetails.email,
            DOB: userDetails.dob,
            shippingAddress: userDetails.shippingAddress,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()
      return {
        access_token: data.access_token,
        callId: data.call_id,
        sampleRate: sampleRate,
      }
    } catch (err) {
      console.error("Error registering call:", err)
      throw err
    }
  }

  const menuItems = [
    "SPECIAL OFFERS",
    "ROOMS",
    "WATER PARK",
    "FACILITIES",
    "WELLNES CLUB",
    "CONVENTION CENTER",
    "ATTRACTIONS",
    "CONTACT US",
  ]

  const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.6);
  }
  50% {
    box-shadow: 0 0 15px 10px rgba(25, 118, 210, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
  }
`

  useEffect(() => {
    if (chatContentRef.current) {
      chatContentRef.current.scrollTop = chatContentRef.current.scrollHeight
    }
  }, [])

  return (
    <ThemeProvider theme={theme}>
      {/* Navbar */}
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: trigger ? "rgba(255, 255, 255, 0.95)" : "transparent",
          transition: "background-color 0.3s ease",
          boxShadow: trigger ? 1 : 0,
          width: "100%",
        }}
      >
        <Toolbar sx={{ width: "100%", px: 2, justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <img src="/logo.png" alt="Gai Beach" style={{ height: 40 }} />
          </Box>
          <Box sx={{ display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
            {menuItems.map((item) => (
              <Button
                key={item}
                sx={{
                  color: trigger ? "text.primary" : "white",
                  mx: 1,
                  "&:hover": {
                    backgroundColor: "transparent",
                    color: "primary.main",
                  },
                }}
              >
                {item}
              </Button>
            ))}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                mr: 2,
                color: trigger ? "text.primary" : "white",
              }}
            >
              <WbSunnyIcon sx={{ mr: 1 }} />
              <Typography>13°C</Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<LanguageIcon />}
              sx={{
                color: trigger ? "text.primary" : "white",
                borderColor: trigger ? "text.primary" : "white",
                display: { xs: "none", sm: "flex" },
              }}
            >
              עברית
            </Button>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ display: { md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <IconButton onClick={() => setMobileMenuOpen(false)}>
            <MenuIcon />
          </IconButton>
        </Box>
        <Divider />
        <List>
          {menuItems.map((item) => (
            <ListItem key={item} disablePadding>
              <ListItemButton onClick={() => setMobileMenuOpen(false)}>
                <ListItemText primary={item} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Button variant="outlined" startIcon={<LanguageIcon />} fullWidth sx={{ mb: 2 }}>
            עברית
          </Button>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WbSunnyIcon sx={{ mr: 1 }} />
            <Typography>13°C</Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Hero Section */}
      <Box
        sx={{
          height: "100vh",
          width: "100vw",
          position: "relative",
          backgroundImage: "url(https://www.gaibeach.co.il/octopus/Upload/images/Pages/main-img.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: 0,
          padding: 0,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            bottom: { xs: 100, sm: 120, md: 150 },
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 3,
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            maxWidth: "600px",
          }}
        >
          <Box
            sx={{
              display: "flex",
              gap: 3,
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              width: "100%",
              justifyContent: "center",
            }}
          >
            {/* Call Button */}
            <Button
              variant="contained"
              color={callStatus === "active" ? "error" : "success"}
              startIcon={callStatus === "active" ? <CallEndIcon /> : <CallIcon />}
              onClick={toggleConversation}
              sx={{
                borderRadius: "30px",
                minWidth: "180px",
                height: "60px",
                fontSize: "17px",
                fontWeight: "600",
                textTransform: "none",
                transition: "all 0.3s ease-in-out",
                background:
                  callStatus === "active"
                    ? "linear-gradient(45deg, #b91c1c 30%, #ef4444 90%)"
                    : "linear-gradient(45deg, #1e3a8a 30%, #3b82f6 90%)",
                boxShadow:
                  callStatus === "active" ? "0 6px 20px rgba(185, 28, 28, 0.3)" : "0 6px 20px rgba(30, 58, 138, 0.3)",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow:
                    callStatus === "active" ? "0 8px 25px rgba(185, 28, 28, 0.4)" : "0 8px 25px rgba(30, 58, 138, 0.4)",
                },
                animation: callStatus === "active" ? `${pulse} 1.5s infinite` : "none",
                letterSpacing: "0.5px",
                border:
                  callStatus === "active" ? "1px solid rgba(185, 28, 28, 0.3)" : "1px solid rgba(30, 58, 138, 0.3)",
              }}
            >
              {callStatus === "active" ? "End Call" : "Start Call"}
            </Button>

            {/* Chat Button */}
            <Button
              variant="contained"
              color="secondary"
              startIcon={<ChatIcon />}
              onClick={() => setChatActive((prev) => !prev)}
              sx={{
                borderRadius: "30px",
                minWidth: "180px",
                height: "60px",
                fontSize: "17px",
                fontWeight: "600",
                textTransform: "none",
                transition: "all 0.3s ease-in-out",
                background: "linear-gradient(45deg, #0f766e 30%, #14b8a6 90%)",
                boxShadow: "0 6px 20px rgba(15, 118, 110, 0.3)",
                "&:hover": {
                  transform: "translateY(-3px)",
                  boxShadow: "0 8px 25px rgba(15, 118, 110, 0.4)",
                },
                animation: chatActive ? `${pulse} 1.5s infinite` : "none",
                letterSpacing: "0.5px",
                border: "1px solid rgba(15, 118, 110, 0.3)",
              }}
            >
              {chatActive ? "Close Chat" : "Open Chat"}
            </Button>
          </Box>

          {/* Transcript Box - Always Visible */}
          <Box
            sx={{
              width: "100%",
              maxWidth: "500px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              mt: 3,
              border: "1px solid rgba(255, 255, 255, 0.18)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Box
              sx={{
                background: "linear-gradient(90deg, #1e3a8a 0%, #3b82f6 100%)",
                padding: "0.8rem 1.2rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  margin: 0,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  letterSpacing: "0.5px",
                }}
              >
                Voice Chat Transcript
              </Typography>
            </Box>
            <Box
              ref={chatContentRef}
              sx={{
                padding: "1.2rem",
                backgroundColor: "rgba(255, 255, 255, 0.9)",
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
                height: transcript.length > 0 ? "250px" : "100px",
                transition: "height 0.3s ease-in-out",
                "&::-webkit-scrollbar": {
                  width: "6px",
                  display: "none", // Hide scrollbar
                },
                scrollbarWidth: "none", // Hide scrollbar for Firefox
                msOverflowStyle: "none", // Hide scrollbar for IE/Edge
              }}
            >
              {transcript.length > 0 ? (
                transcript.map((msg, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      padding: "12px 16px",
                      borderRadius: "12px",
                      margin: "6px 0",
                      maxWidth: "80%",
                      wordBreak: "break-word",
                      backgroundColor: msg.role === "agent" ? "#f0f7ff" : "#1e3a8a",
                      color: msg.role === "agent" ? "#333" : "#fff",
                      alignSelf: msg.role === "agent" ? "flex-start" : "flex-end",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                      position: "relative",
                      "&::after":
                        msg.role !== "agent"
                          ? {
                              content: '""',
                              position: "absolute",
                              bottom: "8px",
                              right: "-6px",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#1e3a8a",
                              transform: "rotate(45deg)",
                              zIndex: -1,
                            }
                          : msg.role === "agent"
                            ? {
                                content: '""',
                                position: "absolute",
                                bottom: "8px",
                                left: "-6px",
                                width: "12px",
                                height: "12px",
                                backgroundColor: "#f0f7ff",
                                transform: "rotate(45deg)",
                                zIndex: -1,
                              }
                            : {},
                    }}
                  >
                    <Typography sx={{ fontSize: "0.95rem", lineHeight: 1.5 }}>{msg.content}</Typography>
                  </Box>
                ))
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    opacity: 0.7,
                  }}
                >
                  <Typography
                    sx={{
                      color: "#555",
                      fontStyle: "italic",
                      textAlign: "center",
                      fontSize: "0.95rem",
                    }}
                  >
                    {callStatus === "active" ? "Listening... Speak now." : "No messages yet."}
                  </Typography>
                  {callStatus !== "active" && (
                    <Typography
                      sx={{
                        color: "#555",
                        textAlign: "center",
                        fontSize: "0.85rem",
                        mt: 1,
                      }}
                    >
                      Click "Start Call" to begin a conversation
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Content Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          {/* Water Park Section */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardMedia component="img" height="200" image="/water-park.jpg" alt="Water Park" />
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Water Park
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Experience extreme fun at our water park with exciting slides and pools. Perfect for family.
                </Typography>
                <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={toggleConversation}>
                  {callStatus === "active" ? "End Call" : "Learn More"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Spa Section */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardMedia component="img" height="200" image="/spa.jpg?height=200&width=400" alt="Spa" />
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Spa & Wellness
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Relax and rejuvenate at our luxury spa with a range of treatments and wellness facilities.
                </Typography>
                <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={toggleConversation}>
                  {callStatus === "active" ? "End Call" : "Learn More"}
                </Button>
              </CardContent>
            </Card>
          </Grid>

          {/* Events Section */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardMedia component="img" height="200" image="/events.jpg?height=200&width=400" alt="Events" />
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Events & Conventions
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Host your special events in our state-of-art convention center with stunning sea views.
                </Typography>
                <Button variant="contained" color="primary" sx={{ mt: 2 }} onClick={toggleConversation}>
                  {callStatus === "active" ? "End Call" : "Learn More"}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          bgcolor: "primary.main",
          color: "white",
          py: 6,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Gai Beach Hotel
              </Typography>
              <Typography variant="body2">Eliezer Kaplan 1 Tiberias</Typography>
              <Typography variant="body2">Phone: 04-6700700</Typography>
              <Typography variant="body2">Email: gaibeach@gaibeach.com</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Quick Links
              </Typography>
              <Link href="#" color="inherit" display="block" sx={{ mb: 1 }}>
                Hotel in Sea of Galilee
              </Link>
              <Link href="#" color="inherit" display="block" sx={{ mb: 1 }}>
                Sea of galilee deals
              </Link>
              <Link href="#" color="inherit" display="block" sx={{ mb: 1 }}>
                Spa in sea of galilee
              </Link>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Follow Us
              </Typography>
              <Box sx={{ display: "flex", gap: 2 }}>
                <IconButton color="inherit">
                  <Facebook />
                </IconButton>
                <IconButton color="inherit">
                  <Instagram />
                </IconButton>
                <IconButton color="inherit">
                  <Twitter />
                </IconButton>
                <IconButton color="inherit">
                  <LinkedIn />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 4, pt: 4, borderTop: "1px solid rgba(255,255,255,0.2)" }}>
            <Typography variant="body2" align="center">
              © {new Date().getFullYear()} Gai Beach Hotel. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

