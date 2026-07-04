#define FAN1   13
#define FAN2   12
#define LIGHT1 14
#define LIGHT2 27
#define LIGHT3 26
#define CURRENT_SENSOR_PIN 36 
int pins[5] = { FAN1, FAN2, LIGHT1, LIGHT2, LIGHT3 };
const char* names[5] = { "Fan 1", "Fan 2", "Light 1", "Light 2", "Light 3" };
bool state[5] = { false, false, false, false, false };

void setup() {
  Serial.begin(115200);
  for (int i = 0; i < 5; i++) pinMode(pins[i], OUTPUT);
}

void loop() {
  static int idx = 0;
  static unsigned long last = 0;
  if (millis() - last > 2000) {
    last = millis();
    state[idx] = !state[idx];
    digitalWrite(pins[idx], state[idx] ? HIGH : LOW);
    Serial.print(names[idx]);
    Serial.println(state[idx] ? " -> ON" : " -> OFF");
    idx = (idx + 1) % 5;

    int raw = analogRead(CURRENT_SENSOR_PIN);
    float voltage = (raw / 4095.0) * 3.3;
    float current = (voltage - 1.65) / 0.185;
    Serial.print("Simulated current draw (A): ");
    Serial.println(current);
  }
}