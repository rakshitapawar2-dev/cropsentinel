import type { AgriculturalKnowledge } from '../types/database'

/**
 * Small SAMPLE agricultural knowledge set.
 *
 * These entries exist so the knowledge architecture and retrieval can be
 * exercised end to end. They are deliberately marked `verification_status:
 * 'sample'` and the UI shows that label. They are NOT verified agricultural
 * research and must be reviewed by an agronomist before they are relied on.
 *
 * Replace or extend this content through the Admin / Knowledge page once real,
 * reviewed material (for example from a state agricultural university
 * extension service) is available.
 */
export const SAMPLE_SOURCE = 'CropSentinel sample content (not yet reviewed by an agronomist)'

export type SampleKnowledge = Omit<AgriculturalKnowledge, 'id' | 'created_at'> & { id: string }

export const sampleKnowledge: SampleKnowledge[] = [
  {
    id: 'kn_sample_yellow_leaves',
    title: 'Yellowing leaves: common causes',
    topic: 'Plant health',
    crop_type: null,
    language: 'en',
    content:
      'Yellowing (chlorosis) is a symptom, not a diagnosis. Possible causes include too much or too little water, nitrogen or iron deficiency, root damage, and several diseases. Where the yellowing starts helps narrow it down: older lower leaves often point to mobile nutrients such as nitrogen, while young upper leaves more often point to iron or sulphur. Check soil moisture and the underside of leaves for insects before treating anything.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_soil_health',
    title: 'Improving soil health on small farms',
    topic: 'Soil health',
    crop_type: null,
    language: 'en',
    content:
      'Soil health improves slowly through organic matter, cover, and gentle cultivation. Practical steps: add well-rotted manure or compost before planting, keep the soil covered with mulch or a cover crop, avoid ploughing wet soil, rotate crop families between seasons, and test the soil every one to three years so fertiliser matches what is actually missing.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_irrigation',
    title: 'Deciding when to irrigate',
    topic: 'Irrigation',
    crop_type: null,
    language: 'en',
    content:
      'Check moisture in the root zone rather than only at the surface: push a finger or a small tool 5–10 cm into the soil near the plant. Water early in the morning where possible, water deeply and less often rather than a little every day, and adjust for crop stage — flowering and fruit filling need the most water. Wet soil that stays wet for days can damage roots as much as drought.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_tomato_blight',
    title: 'Tomato leaf spots and blight: what to look for',
    topic: 'Crop disease',
    crop_type: 'Tomato',
    language: 'en',
    content:
      'Tomato leaves with dark brown spots, yellow halos, or grey mould on the underside may be affected by early blight, late blight or another leaf disease — but similar spots also appear with nutrient problems and water stress. Remove badly affected lower leaves, keep foliage dry by watering at the base, and improve airflow. A photograph in good light plus a description of the pattern is needed before any specific diagnosis is reasonable.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_pest_scouting',
    title: 'Scouting for pests before spraying',
    topic: 'Pest management',
    crop_type: null,
    language: 'en',
    content:
      'Walk a zig-zag path through the field twice a week and inspect 10–20 plants: look at new shoots, the underside of leaves, and near flowers. Many pests can be managed first by hand removal, yellow sticky traps, encouraging natural enemies, and removing crop residue. Chemical pesticide names or doses should only be used on the advice of a local agricultural extension officer, following the label exactly.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_growth_stages',
    title: 'Crop growth stages and care',
    topic: 'Cultivation',
    crop_type: null,
    language: 'en',
    content:
      'Most field crops move through germination, vegetative growth, flowering, and grain or fruit filling. Water and nutrient needs rise sharply at flowering, and plants are most sensitive to stress at that stage. Record the stage when you register a plant so advice can be matched to what the plant is actually doing.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_weather',
    title: 'Farming around weather changes',
    topic: 'Weather',
    crop_type: null,
    language: 'en',
    content:
      'Before spraying, check that rain is not expected within a few hours, and avoid spraying in strong wind or at midday heat. After heavy rain, check for waterlogging and leaf disease; after a dry spell, check the root zone before irrigating. Weather data is not connected in this application yet, so use your local forecast.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_soil_moisture',
    title: 'Reading soil moisture numbers',
    topic: 'Irrigation',
    crop_type: null,
    language: 'en',
    content:
      'Capacitive soil-moisture sensors give a relative number, not a universal truth: the same percentage behaves differently in sandy and clay soils, and in a pot versus a field. Treat thresholds as field-specific starting points, confirm with a hand check, and adjust them for each crop and soil type.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_yellow_leaves_kn',
    title: 'ಎಲೆಗಳು ಹಳದಿಯಾಗುವುದು: ಸಾಮಾನ್ಯ ಕಾರಣಗಳು',
    topic: 'Plant health',
    crop_type: null,
    language: 'kn',
    content:
      'ಎಲೆಗಳು ಹಳದಿಯಾಗುವುದು ಒಂದು ಲಕ್ಷಣ, ರೋಗನಿರ್ಣಯವಲ್ಲ. ಹೆಚ್ಚು ಅಥವಾ ಕಡಿಮೆ ನೀರು, ಸಾರಜನಕ ಅಥವಾ ಕಬ್ಬಿಣದ ಕೊರತೆ, ಬೇರು ಹಾನಿ ಮತ್ತು ಕೆಲವು ರೋಗಗಳು ಕಾರಣವಾಗಬಹುದು. ಹಳದಿ ಎಲ್ಲಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ ಎಂಬುದು ಸುಳಿವು ನೀಡುತ್ತದೆ: ಕೆಳಗಿನ ಹಳೆಯ ಎಲೆಗಳು ಸಾರಜನಕ ಕೊರತೆಯನ್ನು ಸೂಚಿಸಬಹುದು, ಮೇಲಿನ ಹೊಸ ಎಲೆಗಳು ಕಬ್ಬಿಣ ಅಥವಾ ಗಂಧಕದ ಕೊರತೆಯನ್ನು. ಚಿಕಿತ್ಸೆಗೆ ಮೊದಲು ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಎಲೆಯ ಕೆಳಭಾಗವನ್ನು ಪರೀಕ್ಷಿಸಿ.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_irrigation_kn',
    title: 'ಯಾವಾಗ ನೀರು ಹಾಯಿಸಬೇಕು',
    topic: 'Irrigation',
    crop_type: null,
    language: 'kn',
    content:
      'ಮೇಲ್ಮೈ ಮಾತ್ರವಲ್ಲ, ಬೇರು ಪ್ರದೇಶದ ತೇವಾಂಶ ನೋಡಿ: ಸಸ್ಯದ ಬಳಿ 5–10 ಸೆಂ.ಮೀ ಆಳಕ್ಕೆ ಬೆರಳು ಅಥವಾ ಸಣ್ಣ ಸಾಧನ ತಳ್ಳಿ. ಸಾಧ್ಯವಾದರೆ ಬೆಳಗ್ಗೆ ನೀರು ಹಾಯಿಸಿ, ಪ್ರತಿದಿನ ಸ್ವಲ್ಪದ ಬದಲು ಆಳವಾಗಿ ಮತ್ತು ಕಡಿಮೆ ಬಾರಿ ನೀರು ಹಾಯಿಸಿ. ಹೂಬಿಡುವ ಮತ್ತು ಕಾಯಿ ತುಂಬುವ ಹಂತದಲ್ಲಿ ಹೆಚ್ಚು ನೀರು ಬೇಕು. ದಿನಗಳವರೆಗೆ ಒದ್ದೆಯಾಗಿರುವ ಮಣ್ಣು ಬೇರುಗಳಿಗೆ ಹಾನಿ ಮಾಡಬಹುದು.',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_yellow_leaves_hi',
    title: 'पत्तियाँ पीली होना: आम कारण',
    topic: 'Plant health',
    crop_type: null,
    language: 'hi',
    content:
      'पत्तियों का पीला होना एक लक्षण है, निदान नहीं। ज़्यादा या कम पानी, नाइट्रोजन या लोहे की कमी, जड़ की क्षति और कुछ रोग कारण हो सकते हैं। पीलापन कहाँ से शुरू होता है यह संकेत देता है: नीचे की पुरानी पत्तियाँ नाइट्रोजन की कमी की ओर संकेत करती हैं, ऊपर की नई पत्तियाँ लोहे या गंधक की। इलाज से पहले मिट्टी की नमी और पत्ती के नीचे की जाँच करें।',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
  {
    id: 'kn_sample_irrigation_hi',
    title: 'सिंचाई कब करें',
    topic: 'Irrigation',
    crop_type: null,
    language: 'hi',
    content:
      'सिर्फ ऊपरी सतह नहीं, जड़ वाले हिस्से की नमी देखें: पौधे के पास 5–10 सेमी गहराई तक उँगली या छोटी छड़ डालें। हो सके तो सुबह पानी दें, हर दिन थोड़ा देने के बजाय गहरा और कम बार दें। फूल और फल भरने की अवस्था में सबसे ज़्यादा पानी चाहिए। कई दिन तक गीली मिट्टी जड़ों को नुकसान पहुँचा सकती है।',
    source_name: SAMPLE_SOURCE,
    source_url: null,
    verification_status: 'sample',
    last_reviewed: null,
  },
]
