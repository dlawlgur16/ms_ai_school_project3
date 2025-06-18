import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";
import { translateMultipleTexts } from "../utils/translation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import SpeechService from "./SpeechService";
import faqData from "../utils/faqData";
import { List, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const SERVER_URL = process.env.REACT_APP_SERVER_URL || "";

const ChatScreen = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef();
  const [chatHistory, setChatHistory] = useState([]);
  const { languageCode } = useLanguage();
  const [translations, setTranslations] = useState({});
  const [userInfo, setUserInfo] = useState(null);
  const [faqExpanded, setFaqExpanded] = useState([]);
  const [showFaq, setShowFaq] = useState(false);
  const [translatedFaq, setTranslatedFaq] = useState(faqData);

  const initialMessage =
    "안녕하세요 {name}님.\n7팀 챗봇이에요😊\n출입국/체류에 관해서 궁금한 점을 질문해주시면 안내해드릴게요!";

  // 번역이 필요한 텍스트
  const textsToTranslate = {
    placeholder: "Type your message here...",
    send: "Send",
    thinking: "Thinking...",
    initialMessage: initialMessage,
    errorMessage: "죄송합니다. 오류가 발생했습니다. 다시 시도해주세요.",
    connectionError: "서버 연결에 실패했습니다. 인터넷 연결을 확인해주세요.",
    headerTitle: "Foreign Civil Service",
    headerSubtitle: "How can I assist you today?",
    faqToggleLabel: "자주 묻는 질문 보기",
    faqCloseLabel: "닫기",
  };

  // 사용자 정보 가져오기
  const fetchUserInfo = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) return;

      const response = await fetch(`${SERVER_URL}/user-info`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
        // 사용자 정보를 가져온 후 초기 메시지 설정
        const welcomeMessage = initialMessage.replace(
          "{name}",
          data.name || ""
        );
        setMessages([
          {
            text: welcomeMessage,
            isUser: false,
          },
        ]);
      }
    } catch (error) {
      console.error("사용자 정보 조회 오류:", error);
    }
  };

  // 컴포넌트 마운트 시 사용자 정보 가져오기
  useEffect(() => {
    fetchUserInfo();
  }, []);

  // 언어가 변경될 때마다 번역 실행
  useEffect(() => {
    const translateTexts = async () => {
      try {
        const translatedTexts = await translateMultipleTexts(
          textsToTranslate,
          languageCode
        );
        setTranslations(translatedTexts);

        // 초기 메시지가 있고 사용자 정보가 있는 경우에만 번역
        if (messages.length > 0 && userInfo) {
          const welcomeMessage = (
            translatedTexts.initialMessage || initialMessage
          ).replace("{name}", userInfo.name || "");
          setMessages([
            {
              text: welcomeMessage,
              isUser: false,
            },
          ]);
        }
      } catch (error) {
        console.error("Translation error:", error);
      }
    };
    translateTexts();
  }, [languageCode, userInfo]);

  useEffect(() => {
    const translateFaq = async () => {
      if (languageCode === "ko") {
        setTranslatedFaq(faqData);
        return;
      }
      // Flatten all category/question texts
      const allTexts = [];
      faqData.forEach((item) => {
        allTexts.push(item.category);
        allTexts.push(...item.questions);
      });
      // Use index as key for translation
      const textMap = Object.fromEntries(allTexts.map((t, i) => [i, t]));
      try {
        const translated = await translateMultipleTexts(textMap, languageCode);
        let idx = 0;
        const newFaq = faqData.map((item) => {
          const category = translated[idx++];
          const questions = item.questions.map(() => translated[idx++]);
          return { category, questions };
        });
        setTranslatedFaq(newFaq);
      } catch (e) {
        setTranslatedFaq(faqData); // fallback
      }
    };
    translateFaq();
  }, [languageCode]);

  // 마크다운 형식 정리 함수
  const cleanMarkdown = (text) => {
    if (!text) return text;

    // 제목 처리 (#으로 시작하는 라인)
    let processedText = text.replace(/^#+\s*(.*?)$/gm, (match, title) => {
      return `### ${title.trim()}`;
    });

    // 구분선 처리 (---로만 이루어진 라인)
    processedText = processedText.replace(/^---+$/gm, "---");

    // 볼드 처리 (**) 제거
    processedText = processedText.replace(/\*\*/g, "");

    // 빈 줄 정리
    processedText = processedText.replace(/\n\s*\n\s*\n/g, "\n\n");

    return processedText.trim();
  };

  const sendMessage = async (text) => {
    const userMessage = text.trim();
    if (!userMessage) return;

    setInputText("");
    setIsLoading(true);

    try {
      // 1. 입력 메시지를 한국어로 번역 (언어 설정과 관계없이)
      const translationResult = await translateMultipleTexts(
        { message: userMessage },
        "ko" // 항상 한국어로 번역
      );
      const translatedMessage = translationResult.message;

      // 2. 원본 메시지 표시 (사용자가 입력한 그대로)
      setMessages((prev) => [...prev, { text: userMessage, isUser: true }]);

      // 3. 서버로 한국어 메시지 전송
      const response = await fetch(`${SERVER_URL}/chat-rag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: translatedMessage, // 한국어로 번역된 메시지
          chat_history: chatHistory,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // 4. 서버 응답 처리
        let finalReply = cleanMarkdown(data.reply); // 마크다운 정리 적용

        // 5. 한국어가 아닌 언어로 설정된 경우에만 번역
        if (languageCode !== "ko") {
          const translatedReply = await translateMultipleTexts(
            { reply: finalReply },
            languageCode
          );
          finalReply = cleanMarkdown(translatedReply.reply); // 번역 후에도 마크다운 정리
        }

        // 6. 번역된 응답 표시
        setMessages((prev) => [
          ...prev,
          {
            text: finalReply,
            isUser: false,
          },
        ]);
        setChatHistory(data.chat_history);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            text: translations.errorMessage || textsToTranslate.errorMessage,
            isUser: false,
          },
        ]);
      }
    } catch (error) {
      console.error("채팅 오류:", error);
      setMessages((prev) => [
        ...prev,
        {
          text:
            translations.connectionError || textsToTranslate.connectionError,
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderMessage = (message, index) => {
    const lines = message.text.split("\n");

    return (
      <View
        key={index}
        style={[
          styles.messageBubble,
          message.isUser ? styles.userBubble : styles.botBubble,
        ]}
      >
        {lines.map((line, lineIndex) => {
          // 제목 처리 (### 로 시작하는 라인)
          if (line.startsWith("### ")) {
            const titleText = line.replace("### ", "");
            return (
              <View
                key={`title-${lineIndex}`}
                style={[
                  styles.titleContainer,
                  message.isUser
                    ? styles.userTitleContainer
                    : styles.botTitleContainer,
                ]}
              >
                <Text
                  style={[
                    styles.titleText,
                    message.isUser ? styles.userTitleText : styles.botTitleText,
                  ]}
                >
                  {titleText}
                </Text>
              </View>
            );
          }

          // 구분선 처리
          if (line === "---") {
            return (
              <View
                key={`divider-${lineIndex}`}
                style={[
                  styles.divider,
                  message.isUser ? styles.userDivider : styles.botDivider,
                ]}
              />
            );
          }

          // 일반 텍스트
          return (
            <Text
              key={`text-${lineIndex}`}
              style={[
                styles.messageText,
                message.isUser ? styles.userMessageText : styles.botMessageText,
              ]}
            >
              {line}
            </Text>
          );
        })}
      </View>
    );
  };

  const handleSpeechInput = (text) => {
    setInputText(text);
  };

  const handleFaqPress = (idx) => {
    setFaqExpanded((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleFaqQuestion = (question) => {
    setInputText("");
    sendMessage(question);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Image
          source={require("../assets/logo2.png")}
          style={{ width: 48, height: 48, marginBottom: 8 }}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>
          {translations.headerTitle || textsToTranslate.headerTitle}
        </Text>
        <Text style={styles.headerSubtitle}>
          {translations.headerSubtitle || textsToTranslate.headerSubtitle}
        </Text>
      </View>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#2c5282" />
              <Text style={styles.loadingText}>
                {translations.thinking || textsToTranslate.thinking}
              </Text>
            </View>
          )}
        </ScrollView>
        <View style={styles.inputWrapper}>
          {/* FAQ Popup Accordion */}
          {showFaq && (
            <View
              style={[
                styles.faqPopup,
                {
                  padding: 8,
                  backgroundColor: "#f8fafc",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "#e2e8f0",
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                },
              ]}
            >
              <ScrollView style={{ maxHeight: 220 }}>
                {translatedFaq.map((item, idx) => (
                  <View
                    key={item.category}
                    style={{
                      marginBottom: 12,
                      backgroundColor: "#fff",
                      borderRadius: 12,
                      overflow: "hidden",
                      shadowColor: "#000",
                      shadowOpacity: 0.03,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleFaqPress(idx)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        padding: 12,
                        backgroundColor: "#e2e8f0",
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name={
                          faqExpanded.includes(idx)
                            ? "chevron-down"
                            : "chevron-right"
                        }
                        size={20}
                        color="#2c5282"
                      />
                      <Text
                        style={{
                          fontWeight: "bold",
                          fontSize: 15,
                          color: "#2c5282",
                          marginLeft: 6,
                        }}
                      >
                        {item.category}
                      </Text>
                    </TouchableOpacity>
                    {faqExpanded.includes(idx) && (
                      <View style={{ padding: 10, backgroundColor: "#f8fafc" }}>
                        {item.questions.map((q, qIdx) => (
                          <TouchableOpacity
                            key={qIdx}
                            onPress={() => handleFaqQuestion(q)}
                            style={{
                              paddingVertical: 8,
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name="comment-question-outline"
                              size={18}
                              color="#64748b"
                              style={{ marginRight: 6 }}
                            />
                            <Text style={{ fontSize: 13, color: "#334155" }}>
                              {q}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
              <Button
                mode="text"
                compact
                onPress={() => setShowFaq(false)}
                style={{ marginTop: 2, alignSelf: "flex-end" }}
                labelStyle={{ fontSize: 12 }}
              >
                {translations.faqCloseLabel || textsToTranslate.faqCloseLabel}
              </Button>
            </View>
          )}
          {/* End FAQ Popup Accordion */}
          <View style={styles.speechServiceRow}>
            <TouchableOpacity
              style={styles.faqTextButton}
              onPress={() => setShowFaq((prev) => !prev)}
            >
              <Text style={styles.faqTextButtonLabel}>
                {translations.faqToggleLabel || textsToTranslate.faqToggleLabel}
              </Text>
            </TouchableOpacity>
            <View style={styles.speechServiceRightGroup}>
              <View style={styles.speechServiceContainer}>
                <SpeechService
                  onSpeechInput={handleSpeechInput}
                  language={languageCode}
                />
              </View>
              {/* If you have a language selector component, place it here */}
              {/* <LanguageSelector ... /> */}
            </View>
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={inputText}
              onChangeText={setInputText}
              placeholder={
                translations.placeholder || textsToTranslate.placeholder
              }
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                !inputText.trim() && styles.sendButtonDisabled,
              ]}
              onPress={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
            >
              <Ionicons name="send" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  header: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    alignItems: "center",
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ebf8ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2c5282",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#4a5568",
  },
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 24,
  },
  messageBubble: {
    padding: 16,
    borderRadius: 16,
    marginVertical: 6,
    maxWidth: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  botBubble: {
    backgroundColor: "#ffffff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#2c5282",
  },
  userBubble: {
    backgroundColor: "#2c5282",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  botMessageText: {
    color: "#2d3748",
  },
  userMessageText: {
    color: "#ffffff",
  },
  inputWrapper: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 10,
  },
  speechServiceContainer: {
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  input: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sendButton: {
    backgroundColor: "#2c5282",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#cbd5e1",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 16,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderLeftWidth: 3,
    borderLeftColor: "#2c5282",
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#4a5568",
  },
  faqTextButton: {
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
  },
  faqTextButtonLabel: {
    fontSize: 13,
    color: "#2c5282",
    fontWeight: "bold",
  },
  faqPopup: {
    position: "absolute",
    bottom: 60,
    left: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: "transparent",
  },
  speechServiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 0,
    marginBottom: 5,
  },
  speechServiceRightGroup: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 5,
  },
  titleContainer: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: 4,
    width: "100%",
    borderLeftWidth: 4,
  },
  botTitleContainer: {
    backgroundColor: "#EBF8FF",
    borderLeftColor: "#2c5282",
  },
  userTitleContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderLeftColor: "#ffffff",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  botTitleText: {
    color: "#2c5282",
  },
  userTitleText: {
    color: "#ffffff",
  },
  divider: {
    height: 1,
    marginVertical: 12,
    width: "100%",
  },
  botDivider: {
    backgroundColor: "#e2e8f0",
  },
  userDivider: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});

export default ChatScreen;
