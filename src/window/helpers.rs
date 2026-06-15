pub fn parse_ep_num(name: &str) -> i32 {
    let mut parts = name.split_whitespace();
    if let Some(first) = parts.next() {
        if let Ok(num) = first.parse::<i32>() {
            return num;
        }
    }
    for word in name.split_whitespace() {
        let clean: String = word.chars().filter(|c| c.is_ascii_digit()).collect();
        if let Ok(num) = clean.parse::<i32>() {
            return num;
        }
    }
    0
}
