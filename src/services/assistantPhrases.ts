import type { Language } from '../types/database'

/**
 * Fixed sentences the local (no-AI-model) assistant needs so that a farmer can
 * use the chat in their own language before a backend AI model is connected.
 * Content itself comes from the knowledge entries, which carry a language too.
 */
const phrases = {
  en: {
    noPlants:
      "I could not find any plants in your records yet, so I cannot tell you how they are doing. Add a plant under “My Plants” and I can follow its history with you.",
    plantHeader: 'Here is what your records show:',
    attentionHeader: 'These plants have something worth checking:',
    noneNeedAttention:
      'None of your plants has an open alert or a recorded symptom right now. That is based only on the observations you have saved.',
    sensorReading:
      'Your latest soil-moisture reading for {plant} was {value}{unit}, recorded {time}. That is in the “{status}” range you have set for this plant.',
    sensorStale:
      'The latest soil-moisture reading is {value}{unit} from {time}, which is old enough that it may no longer describe the soil.',
    noSensor:
      'I do not have any live soil-moisture reading for this plant, so I cannot say how wet the soil is. Push a finger 5–10 cm into the soil near the roots: if it feels dry at that depth, water in the morning and check again later.',
    askCrop: 'Which crop is this, and roughly how old is the plant?',
    askWhere: 'Where does the yellowing start — on the older lower leaves or the younger top leaves?',
    askPhoto: 'A clear photo of the affected leaf in daylight would help me look at the visible symptoms with you.',
    attachmentNotAnalysed:
      'I have saved your photo with the plant history. The crop image analysis model is not connected yet, so I cannot read the symptoms from the photo — please describe what you see as well.',
    expert:
      'If the problem is spreading or you are unsure, please show it to your local agricultural extension officer or Krishi Vigyan Kendra. They can inspect the plant in person.',
    fallback:
      'I do not have a verified knowledge entry that answers this yet, and I will not guess. Can you tell me the crop, the growth stage, and what you are seeing? Meanwhile these entries are the closest I have:',
    fallbackNoResult:
      'I do not have a verified knowledge entry for this yet, and I will not invent an answer. Tell me the crop, its growth stage and what you see, or ask your local agricultural extension officer.',
    thanks: 'You are welcome. Ask me again whenever something changes in the field.',
    greeting:
      'Namaste! Tell me which crop you are asking about, or upload a photo, and we can work through it step by step.',
    generalAdvice: 'This is general guidance from the knowledge base, not a diagnosis of your plant.',
    noDose:
      'I cannot give a pesticide or fertiliser dose — the right product and quantity depend on your soil test, the crop stage and local rules. Your agricultural extension officer can advise the exact amount safely.',
    weatherNotConnected:
      'Weather data is not connected to CropSentinel yet, so please use your local forecast before spraying or irrigating.',
    soilTest:
      'A soil test every one to three years is the most reliable way to know what your soil is missing.',
  },
  kn: {
    noPlants:
      'ನಿಮ್ಮ ದಾಖಲೆಗಳಲ್ಲಿ ಇನ್ನೂ ಯಾವುದೇ ಸಸ್ಯಗಳಿಲ್ಲ, ಆದ್ದರಿಂದ ಅವು ಹೇಗಿವೆ ಎಂದು ಹೇಳಲಾಗುವುದಿಲ್ಲ. “ನನ್ನ ಸಸ್ಯಗಳು” ಪುಟದಲ್ಲಿ ಸಸ್ಯ ಸೇರಿಸಿ, ನಂತರ ಅದರ ಇತಿಹಾಸವನ್ನು ಜೊತೆಯಾಗಿ ನೋಡೋಣ.',
    plantHeader: 'ನಿಮ್ಮ ದಾಖಲೆಗಳು ತೋರಿಸುವುದು:',
    attentionHeader: 'ಈ ಸಸ್ಯಗಳನ್ನು ಒಮ್ಮೆ ಪರಿಶೀಲಿಸುವುದು ಒಳ್ಳೆಯದು:',
    noneNeedAttention:
      'ಈಗ ಯಾವುದೇ ಸಸ್ಯಕ್ಕೆ ತೆರೆದ ಎಚ್ಚರಿಕೆ ಅಥವಾ ದಾಖಲಾದ ಲಕ್ಷಣಗಳಿಲ್ಲ. ಇದು ನೀವು ಉಳಿಸಿದ ವೀಕ್ಷಣೆಗಳ ಆಧಾರದ ಮೇಲೆ ಮಾತ್ರ.',
    sensorReading:
      '{plant} ನ ಕೊನೆಯ ಮಣ್ಣಿನ ತೇವಾಂಶ {value}{unit}, {time} ಕ್ಕೆ ದಾಖಲಾಗಿದೆ. ಇದು ನೀವು ನಿಗದಿಪಡಿಸಿದ “{status}” ಶ್ರೇಣಿಯಲ್ಲಿದೆ.',
    sensorStale:
      'ಕೊನೆಯ ಮಣ್ಣಿನ ತೇವಾಂಶ {value}{unit}, {time} ರದ್ದು — ಅದು ಈಗಿನ ಮಣ್ಣಿನ ಸ್ಥಿತಿಯನ್ನು ಸರಿಯಾಗಿ ತೋರಿಸದಿರಬಹುದು.',
    noSensor:
      'ಈ ಸಸ್ಯಕ್ಕೆ ನೇರ ಮಣ್ಣಿನ ತೇವಾಂಶ ಮಾಹಿತಿ ಇಲ್ಲ, ಆದ್ದರಿಂದ ಮಣ್ಣು ಎಷ್ಟು ಒದ್ದೆಯಿದೆ ಎಂದು ಹೇಳಲಾಗುವುದಿಲ್ಲ. ಬೇರಿನ ಬಳಿ 5–10 ಸೆಂ.ಮೀ ಆಳಕ್ಕೆ ಬೆರಳು ತಳ್ಳಿ; ಆ ಆಳದಲ್ಲಿ ಒಣಗಿದ್ದರೆ ಬೆಳಗ್ಗೆ ನೀರು ಹಾಯಿಸಿ, ನಂತರ ಮತ್ತೆ ಪರೀಕ್ಷಿಸಿ.',
    askCrop: 'ಇದು ಯಾವ ಬೆಳೆ, ಮತ್ತು ಸಸ್ಯ ಎಷ್ಟು ವಯಸ್ಸು?',
    askWhere: 'ಹಳದಿ ಎಲ್ಲಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ — ಕೆಳಗಿನ ಹಳೆಯ ಎಲೆಗಳಲ್ಲಿ ಅಥವಾ ಮೇಲಿನ ಹೊಸ ಎಲೆಗಳಲ್ಲಿ?',
    askPhoto: 'ಬೆಳಕಿನಲ್ಲಿ ಸ್ಪಷ್ಟವಾದ ಎಲೆಯ ಫೋಟೋ ಇದ್ದರೆ ಲಕ್ಷಣಗಳನ್ನು ಜೊತೆಯಾಗಿ ನೋಡಬಹುದು.',
    attachmentNotAnalysed:
      'ನಿಮ್ಮ ಫೋಟೋವನ್ನು ಸಸ್ಯದ ಇತಿಹಾಸದಲ್ಲಿ ಉಳಿಸಿದ್ದೇನೆ. ಬೆಳೆ ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆ ಮಾದರಿ ಇನ್ನೂ ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ, ಆದ್ದರಿಂದ ಫೋಟೋದಿಂದ ಲಕ್ಷಣ ಓದಲಾಗುವುದಿಲ್ಲ — ದಯವಿಟ್ಟು ನೀವು ಕಾಣುವುದನ್ನು ವಿವರಿಸಿ.',
    expert:
      'ಸಮಸ್ಯೆ ಹರಡುತ್ತಿದ್ದರೆ ಅಥವಾ ಖಚಿತವಿಲ್ಲದಿದ್ದರೆ, ಸ್ಥಳೀಯ ಕೃಷಿ ವಿಸ್ತರಣಾ ಅಧಿಕಾರಿ ಅಥವಾ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರಕ್ಕೆ ತೋರಿಸಿ. ಅವರು ಸಸ್ಯವನ್ನು ನೇರವಾಗಿ ಪರೀಕ್ಷಿಸಬಲ್ಲರು.',
    fallback:
      'ಇದಕ್ಕೆ ದೃಢೀಕೃತ ಮಾಹಿತಿ ನಮೂದು ಇನ್ನೂ ಇಲ್ಲ, ಮತ್ತು ನಾನು ಊಹಿಸುವುದಿಲ್ಲ. ಬೆಳೆ, ಬೆಳವಣಿಗೆ ಹಂತ ಮತ್ತು ನೀವು ಕಾಣುವುದನ್ನು ಹೇಳಿ. ಸದ್ಯ ಹತ್ತಿರದ ಮಾಹಿತಿಗಳು:',
    fallbackNoResult:
      'ಇದಕ್ಕೆ ದೃಢೀಕೃತ ಮಾಹಿತಿ ಇಲ್ಲ, ಮತ್ತು ನಾನು ಉತ್ತರವನ್ನು ಸೃಷ್ಟಿಸುವುದಿಲ್ಲ. ಬೆಳೆ, ಹಂತ ಮತ್ತು ಲಕ್ಷಣಗಳನ್ನು ತಿಳಿಸಿ, ಅಥವಾ ಸ್ಥಳೀಯ ಕೃಷಿ ಅಧಿಕಾರಿಯನ್ನು ಸಂಪರ್ಕಿಸಿ.',
    thanks: 'ಸ್ವಾಗತ. ಹೊಲದಲ್ಲಿ ಏನಾದರೂ ಬದಲಾದಾಗ ಮತ್ತೆ ಕೇಳಿ.',
    greeting: 'ನಮಸ್ತೆ! ಯಾವ ಬೆಳೆ ಬಗ್ಗೆ ಕೇಳುತ್ತಿದ್ದೀರಿ ಎಂದು ಹೇಳಿ, ಅಥವಾ ಫೋಟೋ ಅಪ್ಲೋಡ್ ಮಾಡಿ — ಹಂತ ಹಂತವಾಗಿ ನೋಡೋಣ.',
    generalAdvice: 'ಇದು ಮಾಹಿತಿ ಭಂಡಾರದ ಸಾಮಾನ್ಯ ಸಲಹೆ, ನಿಮ್ಮ ಸಸ್ಯದ ರೋಗನಿರ್ಣಯವಲ್ಲ.',
    noDose:
      'ಕೀಟನಾಶಕ ಅಥವಾ ಗೊಬ್ಬರದ ಪ್ರಮಾಣ ನಾನು ಹೇಳಲಾರೆ — ಸರಿಯಾದ ಉತ್ಪನ್ನ ಮತ್ತು ಪ್ರಮಾಣ ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ, ಬೆಳೆ ಹಂತ ಮತ್ತು ಸ್ಥಳೀಯ ನಿಯಮಗಳನ್ನು ಅವಲಂಬಿಸಿದೆ. ಕೃಷಿ ವಿಸ್ತರಣಾ ಅಧಿಕಾರಿ ನಿಖರ ಪ್ರಮಾಣ ತಿಳಿಸಬಲ್ಲರು.',
    weatherNotConnected:
      'ಹವಾಮಾನ ಮಾಹಿತಿ ಇನ್ನೂ ಕ್ರಾಪ್ಸೆಂಟಿನೆಲ್‌ಗೆ ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ, ಆದ್ದರಿಂದ ಸಿಂಪಡಿಸುವ ಮೊದಲು ಅಥವಾ ನೀರು ಹಾಯಿಸುವ ಮೊದಲು ಸ್ಥಳೀಯ ಮುನ್ಸೂಚನೆ ನೋಡಿ.',
    soilTest:
      'ಪ್ರತಿ ಒಂದರಿಂದ ಮೂರു ವರ್ಷಕ್ಕೊಮ್ಮೆ ಮಣ್ಣಿನ ಪರೀಕ್ಷೆ ಮಾಡಿಸುವುದು ಮಣ್ಣಿನಲ್ಲಿ ಏನು ಕೊರತೆ ಇದೆ ಎಂದು ತಿಳಿಯಲು ಅತ್ಯಂತ ನಂಬಿಕೆಯ ದಾರಿ.',
  },
  hi: {
    noPlants:
      'आपके रिकॉर्ड में अभी कोई पौधा नहीं है, इसलिए मैं नहीं बता सकता कि वे कैसे हैं। “मेरे पौधे” में पौधा जोड़ें, फिर हम उसका इतिहास साथ देखेंगे।',
    plantHeader: 'आपके रिकॉर्ड के अनुसार:',
    attentionHeader: 'इन पौधों को एक बार देखना अच्छा होगा:',
    noneNeedAttention:
      'अभी किसी पौधे पर खुली चेतावनी या दर्ज लक्षण नहीं है। यह केवल आपके सहेजे अवलोकनों पर आधारित है।',
    sensorReading:
      '{plant} की अंतिम मिट्टी नमी {value}{unit} थी, {time} पर दर्ज। यह आपके तय “{status}” दायरे में है।',
    sensorStale:
      'अंतिम मिट्टी नमी {value}{unit} है, {time} की — इतनी पुरानी कि अब मिट्टी की स्थिति न बताए।',
    noSensor:
      'इस पौधे के लिए कोई लाइव मिट्टी नमी रीडिंग नहीं है, इसलिए मैं नहीं कह सकता कि मिट्टी कितनी गीली है। जड़ों के पास 5–10 सेमी गहराई तक उँगली डालें; वहाँ सूखी लगे तो सुबह पानी दें और फिर जाँचें।',
    askCrop: 'यह कौन सी फसल है और पौधा लगभग कितना पुराना है?',
    askWhere: 'पीलापन कहाँ से शुरू होता है — नीचे की पुरानी पत्तियों से या ऊपर की नई पत्तियों से?',
    askPhoto: 'दिन की रोशनी में प्रभावित पत्ती की साफ फोटो हो तो लक्षण साथ देख सकते हैं।',
    attachmentNotAnalysed:
      'आपकी फोटो पौधे के इतिहास में सहेज दी है। फसल फोटो जाँच मॉडल अभी जुड़ा नहीं है, इसलिए फोटो से लक्षण नहीं पढ़ सकता — कृपया आप जो देख रहे हैं वह भी बताएँ।',
    expert:
      'समस्या फैल रही हो या संदेह हो तो स्थानीय कृषि विस्तार अधिकारी या कृषि विज्ञान केंद्र को दिखाएँ। वे पौधा खुद जाँच सकते हैं।',
    fallback:
      'इसका कोई सत्यापित जानकारी प्रविष्टि अभी नहीं है, और मैं अनुमान नहीं लगाऊँगा। फसल, वृद्धि अवस्था और आपको क्या दिख रहा है बताएँ। फिलहाल निकटतम प्रविष्टियाँ:',
    fallbackNoResult:
      'इसके लिए सत्यापित जानकारी नहीं है, और मैं उत्तर नहीं गढ़ूँगा। फसल, अवस्था और लक्षण बताएँ, या स्थानीय कृषि अधिकारी से सलाह लें।',
    thanks: 'आपका स्वागत है। खेत में कुछ बदले तो फिर पूछें।',
    greeting: 'नमस्ते! बताएँ किस फसल के बारे में पूछ रहे हैं, या फोटो अपलोड करें — हम कदम दर कदम देखेंगे।',
    generalAdvice: 'यह जानकारी संग्रह की सामान्य सलाह है, आपके पौधे का निदान नहीं।',
    noDose:
      'कीटनाशक या खाद की मात्रा मैं नहीं बता सकता — सही उत्पाद और मात्रा मिट्टी जाँच, फसल अवस्था और स्थानीय नियमों पर निर्भर है। कृषि विस्तार अधिकारी सही मात्रा बता सकते हैं।',
    weatherNotConnected:
      'मौसम जानकारी अभी क्रॉपसेंटिनल से जुड़ी नहीं है, इसलिए छिड़काव या सिंचाई से पहले स्थानीय पूर्वानुमान देखें।',
    soilTest:
      'हर एक से तीन साल में मिट्टी जाँच कराना सबसे भरोसेमंद तरीका है यह जानने का कि मिट्टी में क्या कम है।',
  },
} as const

export type PhraseKey = keyof (typeof phrases)['en']

export function phrase(language: Language, key: PhraseKey, vars?: Record<string, string | number>): string {
  let text: string = phrases[language][key] ?? phrases.en[key]
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value))
    }
  }
  return text
}
